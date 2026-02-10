package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/atlas/services/common/config"
	"github.com/atlas/services/common/db"
	"github.com/atlas/services/common/kafka"
	"github.com/atlas/services/common/model"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

var (
	kafkaBrokers    = []string{"localhost:19092"}
	topicCommands   = "orders.commands"
	topicExecs      = "exec.reports"
	topicMarketData = "market.data"
	producer        *kafka.Producer

	// WebSocket hub
	clients   = make(map[*websocket.Conn]bool)
	broadcast = make(chan []byte)
	upgrader  = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true // Allow all for local dev
		},
	}
	mu sync.Mutex

	// Persistence
	dynamoClient *db.DynamoClient
	awsCfg       *config.AWSConfig

	// Balance Manager State (Default demo values)
	initialUSD = 1000000.0
	initialBTC = 50.0
)

func main() {
	ctx := context.Background()

	// Load AWS Config
	awsCfg = config.LoadAWSConfig("order-gateway")

	// Initialize Kafka Producer
	producer = kafka.NewProducer(kafkaBrokers, topicCommands)
	defer producer.Close()

	// Initialize DynamoDB Client
	dynamo, err := db.NewDynamoClient(ctx, awsCfg.Region, awsCfg.DynamoDBEndpoint)
	if err != nil {
		log.Fatalf("Failed to connect to DynamoDB: %v", err)
	}
	dynamoClient = dynamo

	// Start Kafka Consumer for Exec Reports (to broadcast to WS + Update Balances)
	go startConsumer()
	go startMarketDataConsumer()

	// Start WebSocket hub
	go handleMessages()

	// HTTP Server
	mux := http.NewServeMux()
	mux.HandleFunc("/orders", enableCors(handleOrderEntry))
	mux.HandleFunc("/balances", enableCors(handleBalances))
	mux.HandleFunc("/ws", handleWebSocket)
	mux.HandleFunc("/health", enableCors(handleHealth))
	mux.HandleFunc("/debug/ddb", enableCors(handleDebugDDB))

	server := &http.Server{
		Addr:    ":8001",
		Handler: mux,
	}

	go func() {
		log.Println("Starting Order Gateway on :8001")
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}
}

func handleBalances(w http.ResponseWriter, r *http.Request) {
	accountID := r.URL.Query().Get("account_id")
	if accountID == "" {
		accountID = "ACC_CHILD_1" // Default for demo
	}

	ctx := r.Context()
	acc, err := getAccount(ctx, accountID)
	if err != nil {
		log.Printf("[GATEWAY] Error getting balance for %s: %v", accountID, err)
		http.Error(w, "Error fetching balances", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(acc)
}

func getAccount(ctx context.Context, accountID string) (*model.Account, error) {
	result, err := dynamoClient.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(awsCfg.BalancesTable),
		Key: map[string]types.AttributeValue{
			"account_id": &types.AttributeValueMemberS{Value: accountID},
		},
	})

	if err != nil {
		return nil, err
	}

	if result.Item == nil {
		log.Printf("[GATEWAY] Initializing new account in DynamoDB: %s", accountID)
		acc := &model.Account{
			USD: model.Balance{Available: initialUSD, Reserved: 0.0},
			BTC: model.Balance{Available: initialBTC, Reserved: 0.0},
		}
		item, _ := attributevalue.MarshalMap(map[string]interface{}{
			"account_id":    accountID,
			"usd_available": acc.USD.Available,
			"usd_reserved":  acc.USD.Reserved,
			"btc_available": acc.BTC.Available,
			"btc_reserved":  acc.BTC.Reserved,
			"updated_at":    time.Now().Unix(),
		})
		_, err = dynamoClient.PutItem(ctx, &dynamodb.PutItemInput{
			TableName: aws.String(awsCfg.BalancesTable),
			Item:      item,
		})
		if err != nil {
			log.Printf("[DDB-WRITE-ERROR] Table=%s Key=%s Error=%v", awsCfg.BalancesTable, accountID, err)
		} else {
			log.Printf("[DDB-WRITE-SUCCESS] Table=%s Key=%s (Initial balances created)", awsCfg.BalancesTable, accountID)
		}
		return acc, err
	}

	var data struct {
		USDAvailable float64 `dynamodbav:"usd_available"`
		USDReserved  float64 `dynamodbav:"usd_reserved"`
		BTCAvailable float64 `dynamodbav:"btc_available"`
		BTCReserved  float64 `dynamodbav:"btc_reserved"`
	}
	if err := attributevalue.UnmarshalMap(result.Item, &data); err != nil {
		return nil, err
	}

	return &model.Account{
		USD: model.Balance{Available: data.USDAvailable, Reserved: data.USDReserved},
		BTC: model.Balance{Available: data.BTCAvailable, Reserved: data.BTCReserved},
	}, nil
}

func handleOrderEntry(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	ctx := r.Context()
	bodyBytes, _ := io.ReadAll(r.Body)
	r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

	var cmd model.OrderCommand
	if err := json.NewDecoder(r.Body).Decode(&cmd); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Idempotency Check using CommandID
	if cmd.CommandID != "" {
		isNew, err := checkIdempotency(ctx, cmd.CommandID)
		if err != nil {
			log.Printf("[GATEWAY] Idempotency check failed: %v", err)
			http.Error(w, "System Error", http.StatusInternalServerError)
			return
		}
		if !isNew {
			log.Printf("[GATEWAY] Duplicate command detected: %s", cmd.CommandID)
			w.WriteHeader(http.StatusAccepted)
			json.NewEncoder(w).Encode(map[string]string{"status": "duplicate", "command_id": cmd.CommandID})
			return
		}
	}

	// Enrich command
	if cmd.OrderID == "" {
		cmd.OrderID = uuid.New().String()
	}
	if cmd.Timestamp.IsZero() {
		cmd.Timestamp = time.Now().UTC()
	}

	// PRE-TRADE CHECK & PERSISTENT RESERVATION (DynamoDB)
	accountID := cmd.ClientID
	if accountID == "" {
		accountID = "ACC_CHILD_1" // Fallback for very old commands
	}
	if err := reserveBalances(ctx, accountID, cmd); err != nil {
		log.Printf("[GATEWAY] Reservation failed for %s: %v", accountID, err)
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Send to Kafka
	key := []byte(cmd.OrderID)
	value, _ := json.Marshal(cmd)
	if err := producer.Produce(ctx, key, value); err != nil {
		log.Printf("[GATEWAY] Failed to produce order_id=%s to Kafka: %v", cmd.OrderID, err)
		undoReservation(ctx, accountID, cmd)
		http.Error(w, "Failed to submit order", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(map[string]string{"status": "accepted", "order_id": cmd.OrderID, "command_id": cmd.CommandID})
}

func checkIdempotency(ctx context.Context, commandID string) (bool, error) {
	_, err := dynamoClient.PutItem(ctx, &dynamodb.PutItemInput{
		TableName:           aws.String(awsCfg.IdempotencyTable),
		Item:                map[string]types.AttributeValue{"request_id": &types.AttributeValueMemberS{Value: commandID}},
		ConditionExpression: aws.String("attribute_not_exists(request_id)"),
	})
	if err != nil {
		var condErr *types.ConditionalCheckFailedException
		if errors.As(err, &condErr) {
			return false, nil
		}
		log.Printf("[DDB-WRITE-ERROR] Table=%s Key=%s Error=%v", awsCfg.IdempotencyTable, commandID, err)
		return false, err
	}
	log.Printf("[DDB-WRITE-SUCCESS] Table=%s Key=%s (Idempotency stored)", awsCfg.IdempotencyTable, commandID)
	return true, nil
}

func reserveBalances(ctx context.Context, accountID string, cmd model.OrderCommand) error {
	// Ensure account exists first
	_, err := getAccount(ctx, accountID)
	if err != nil {
		return fmt.Errorf("failed to prepare account: %w", err)
	}

	cost := cmd.QuantityVal * cmd.Price

	update := &dynamodb.UpdateItemInput{
		TableName: aws.String(awsCfg.BalancesTable),
		Key: map[string]types.AttributeValue{
			"account_id": &types.AttributeValueMemberS{Value: accountID},
		},
	}

	if cmd.Side == model.OrderSideBuy {
		update.UpdateExpression = aws.String("SET usd_available = usd_available - :cost, usd_reserved = usd_reserved + :cost")
		update.ConditionExpression = aws.String("usd_available >= :cost")
		update.ExpressionAttributeValues = map[string]types.AttributeValue{
			":cost": &types.AttributeValueMemberN{Value: fmt.Sprintf("%f", cost)},
		}
	} else {
		update.UpdateExpression = aws.String("SET btc_available = btc_available - :qty, btc_reserved = btc_reserved + :qty")
		update.ConditionExpression = aws.String("btc_available >= :qty")
		update.ExpressionAttributeValues = map[string]types.AttributeValue{
			":qty": &types.AttributeValueMemberN{Value: fmt.Sprintf("%f", cmd.QuantityVal)},
		}
	}

	_, err = dynamoClient.UpdateItem(ctx, update)
	if err != nil {
		var condErr *types.ConditionalCheckFailedException
		if errors.As(err, &condErr) {
			return fmt.Errorf("insufficient funds/inventory")
		}
		log.Printf("[DDB-WRITE-ERROR] Table=%s Key=%s Error=%v", awsCfg.BalancesTable, accountID, err)
		return err
	}
	log.Printf("[DDB-WRITE-SUCCESS] Table=%s Key=%s (Balances reserved for order %s)", awsCfg.BalancesTable, accountID, cmd.OrderID)
	return nil
}

func undoReservation(ctx context.Context, accountID string, cmd model.OrderCommand) {
	cost := cmd.QuantityVal * cmd.Price
	update := &dynamodb.UpdateItemInput{
		TableName: aws.String(awsCfg.BalancesTable),
		Key: map[string]types.AttributeValue{
			"account_id": &types.AttributeValueMemberS{Value: accountID},
		},
	}
	if cmd.Side == model.OrderSideBuy {
		update.UpdateExpression = aws.String("SET usd_available = usd_available + :cost, usd_reserved = usd_reserved - :cost")
		update.ExpressionAttributeValues = map[string]types.AttributeValue{
			":cost": &types.AttributeValueMemberN{Value: fmt.Sprintf("%f", cost)},
		}
	} else {
		update.UpdateExpression = aws.String("SET btc_available = btc_available + :qty, btc_reserved = btc_reserved - :qty")
		update.ExpressionAttributeValues = map[string]types.AttributeValue{
			":qty": &types.AttributeValueMemberN{Value: fmt.Sprintf("%f", cmd.QuantityVal)},
		}
	}
	_, err := dynamoClient.UpdateItem(ctx, update)
	if err != nil {
		log.Printf("[DDB-WRITE-ERROR] Table=%s Key=%s Error=%v", awsCfg.BalancesTable, accountID, err)
	} else {
		log.Printf("[DDB-WRITE-SUCCESS] Table=%s Key=%s (Reservation undone for order %s)", awsCfg.BalancesTable, accountID, cmd.OrderID)
	}
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}

	mu.Lock()
	clients[ws] = true
	mu.Unlock()

	log.Println("New WebSocket client connected")

	for {
		if _, _, err := ws.NextReader(); err != nil {
			mu.Lock()
			delete(clients, ws)
			mu.Unlock()
			ws.Close()
			break
		}
	}
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func handleDebugDDB(w http.ResponseWriter, r *http.Request) {
	status := "OK"
	_, err := dynamoClient.DescribeTable(context.Background(), &dynamodb.DescribeTableInput{
		TableName: aws.String(awsCfg.BalancesTable),
	})
	if err != nil {
		status = fmt.Sprintf("FAIL: %v", err)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"service":           "order-gateway",
		"region":            awsCfg.Region,
		"balances_table":    awsCfg.BalancesTable,
		"endpoint_override": awsCfg.DynamoDBEndpoint,
		"use_ddb_local":     awsCfg.UseLocalDDB,
		"ddb_status":        status,
	})
}

func handleMessages() {
	for {
		msg := <-broadcast
		mu.Lock()
		for client := range clients {
			err := client.WriteMessage(websocket.TextMessage, msg)
			if err != nil {
				log.Printf("Websocket error: %v", err)
				client.Close()
				delete(clients, client)
			}
		}
		mu.Unlock()
	}
}

func startConsumer() {
	consumer := kafka.NewConsumer(kafkaBrokers, topicExecs, "order-gateway-group-v6")
	defer consumer.Close()

	log.Println("Started consumer for exec.reports")

	err := consumer.Consume(context.Background(), func(ctx context.Context, msg kafka.Message) error {
		var report model.ExecutionReport
		if err := json.Unmarshal(msg.Value, &report); err == nil {
			updateBalances(report)
		}

		broadcast <- msg.Value
		return nil
	})

	if err != nil {
		log.Fatal("Consumer failed:", err)
	}
}

func updateBalances(report model.ExecutionReport) {
	accountID := report.ClientID
	if accountID == "" {
		accountID = "ACC_CHILD_1"
	}
	ctx := context.Background()

	if report.Status == model.OrderStatusFilled || report.Status == model.OrderStatusPartiallyFilled {
		fillQty := report.LastQty
		fillPx := report.LastPx
		limitPx := report.Price
		if limitPx == 0 {
			limitPx = fillPx
		}

		update := &dynamodb.UpdateItemInput{
			TableName: aws.String(awsCfg.BalancesTable),
			Key: map[string]types.AttributeValue{
				"account_id": &types.AttributeValueMemberS{Value: accountID},
			},
		}

		if report.Side == model.OrderSideBuy {
			reservedAmount := fillQty * limitPx
			actualCost := fillQty * fillPx
			refund := reservedAmount - actualCost

			update.UpdateExpression = aws.String("SET usd_reserved = usd_reserved - :res, usd_available = usd_available + :ref, btc_available = btc_available + :qty")
			update.ExpressionAttributeValues = map[string]types.AttributeValue{
				":res": &types.AttributeValueMemberN{Value: fmt.Sprintf("%f", reservedAmount)},
				":ref": &types.AttributeValueMemberN{Value: fmt.Sprintf("%f", refund)},
				":qty": &types.AttributeValueMemberN{Value: fmt.Sprintf("%f", fillQty)},
			}
		} else {
			proceeds := fillQty * fillPx
			update.UpdateExpression = aws.String("SET btc_reserved = btc_reserved - :qty, usd_available = usd_available + :proc")
			update.ExpressionAttributeValues = map[string]types.AttributeValue{
				":qty":  &types.AttributeValueMemberN{Value: fmt.Sprintf("%f", fillQty)},
				":proc": &types.AttributeValueMemberN{Value: fmt.Sprintf("%f", proceeds)},
			}
		}
		_, err := dynamoClient.UpdateItem(ctx, update)
		if err != nil {
			log.Printf("[DDB-WRITE-ERROR] Table=%s Key=%s Error=%v", awsCfg.BalancesTable, accountID, err)
		} else {
			log.Printf("[DDB-WRITE-SUCCESS] Table=%s Key=%s (Balances settled for order %s)", awsCfg.BalancesTable, accountID, report.OrderID)
		}

	} else if report.Status == model.OrderStatusCanceled || report.Status == model.OrderStatusRejected {
		leaves := report.LeavesQty
		if report.Status == model.OrderStatusRejected {
			leaves = report.OrderQty
		}

		if leaves > 0 {
			update := &dynamodb.UpdateItemInput{
				TableName: aws.String(awsCfg.BalancesTable),
				Key: map[string]types.AttributeValue{
					"account_id": &types.AttributeValueMemberS{Value: accountID},
				},
			}
			if report.Side == model.OrderSideBuy {
				limitPx := report.Price
				amount := leaves * limitPx
				update.UpdateExpression = aws.String("SET usd_reserved = usd_reserved - :amt, usd_available = usd_available + :amt")
				update.ExpressionAttributeValues = map[string]types.AttributeValue{
					":amt": &types.AttributeValueMemberN{Value: fmt.Sprintf("%f", amount)},
				}
			} else {
				update.UpdateExpression = aws.String("SET btc_reserved = btc_reserved - :qty, btc_available = btc_available + :qty")
				update.ExpressionAttributeValues = map[string]types.AttributeValue{
					":qty": &types.AttributeValueMemberN{Value: fmt.Sprintf("%f", leaves)},
				}
			}
			update.ConditionExpression = aws.String("usd_reserved >= :amt OR btc_reserved >= :qty") // Safety guard
			_, err := dynamoClient.UpdateItem(ctx, update)
			if err != nil {
				log.Printf("[DDB-WRITE-ERROR] Table=%s Key=%s Error=%v", awsCfg.BalancesTable, accountID, err)
			} else {
				log.Printf("[DDB-WRITE-SUCCESS] Table=%s Key=%s (Balances released for order %s, status=%s)", awsCfg.BalancesTable, accountID, report.OrderID, report.Status)
			}
		}
	}
}

func startMarketDataConsumer() {
	consumer := kafka.NewConsumer(kafkaBrokers, topicMarketData, "order-gateway-md-group")
	defer consumer.Close()

	err := consumer.Consume(context.Background(), func(ctx context.Context, msg kafka.Message) error {
		broadcast <- msg.Value
		return nil
	})

	if err != nil {
		log.Printf("Market Data Consumer failed: %v", err)
	}
}

func enableCors(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)
	}
}
