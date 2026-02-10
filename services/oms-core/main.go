package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/atlas/services/common/config"
	"github.com/atlas/services/common/db"
	"github.com/atlas/services/common/kafka"
	"github.com/atlas/services/common/model"
	"github.com/atlas/services/oms-core/fsm"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/google/uuid"
)

var (
	kafkaBrokers  = []string{"localhost:19092"}
	topicCommands = "orders.commands"
	topicEvents   = "orders.events"
	topicExecs    = "exec.reports"

	producer *kafka.Producer

	// Persistence
	dynamoClient *db.DynamoClient
	awsCfg       *config.AWSConfig
)

func main() {
	// Load AWS Config
	awsCfg = config.LoadAWSConfig("oms-core")

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	producer = kafka.NewProducer(kafkaBrokers, topicEvents)
	defer producer.Close()

	// Initialize DynamoDB Client
	dynamo, err := db.NewDynamoClient(ctx, awsCfg.Region, awsCfg.DynamoDBEndpoint)
	if err != nil {
		log.Fatalf("Failed to connect to DynamoDB: %v", err)
	}
	dynamoClient = dynamo

	execProducer := kafka.NewProducer(kafkaBrokers, topicExecs)
	defer execProducer.Close()

	consumer := kafka.NewConsumer(kafkaBrokers, topicCommands, "oms-core-group-v6")
	defer consumer.Close()

	// Consumer for Exec Reports (from Venue)
	execConsumer := kafka.NewConsumer(kafkaBrokers, topicExecs, "oms-core-exec-group-v6")
	defer execConsumer.Close()

	log.Println("OMS Core started...")

	// Start Debug HTTP Server
	go func() {
		mux := http.NewServeMux()
		mux.HandleFunc("/debug/ddb", handleDebugDDB)
		mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
			fmt.Fprintln(w, "OK")
		})
		log.Println("[OMS] Debug server listening on :8002")
		if err := http.ListenAndServe(":8002", mux); err != nil {
			log.Printf("[OMS] Debug server failed: %v", err)
		}
	}()

	// Handle graceful shutdown
	go func() {
		sig := make(chan os.Signal, 1)
		signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
		<-sig
		cancel()
	}()

	// CRITICAL: Start Exec Consumer BEFORE the blocking command consumer
	// This goroutine consumes FILLED reports from venue-sim
	go func() {
		log.Println("[OMS] Starting Exec Reports consumer...")
		err := execConsumer.Consume(ctx, func(ctx context.Context, msg kafka.Message) error {
			var report model.ExecutionReport
			if err := json.Unmarshal(msg.Value, &report); err != nil {
				log.Printf("[OMS] Error unmarshalling exec report: %v", err)
				return nil
			}

			log.Printf("[OMS] Received exec report: order_id=%s status=%s cum_qty=%f avg_px=%f",
				report.OrderID, report.Status, report.CumQty, report.AvgPx)

			// Update state based on report in DynamoDB
			oldStatus, err := getOrderStatus(ctx, report.OrderID)
			if err != nil {
				log.Printf("[OMS] ⚠️  WARNING: Order %s not found in DynamoDB, skipping state update", report.OrderID)
				return nil
			}

			sm := fsm.StateMachine{State: oldStatus}

			var eventType string
			switch report.Status {
			case model.OrderStatusFilled:
				if sm.State != model.OrderStatusFilled {
					eventType = "ORDER_FILLED"
				}
			case model.OrderStatusPartiallyFilled:
				if sm.State != model.OrderStatusPartiallyFilled {
					eventType = "ORDER_PARTIALLY_FILLED"
				}
			case model.OrderStatusCanceled:
				if sm.State != model.OrderStatusCanceled {
					eventType = "ORDER_CANCELED"
				}
			case model.OrderStatusLive:
				if sm.State != model.OrderStatusLive {
					eventType = "ORDER_LIVE"
					sm.State = model.OrderStatusLive
				}
			}

			if eventType != "" {
				// Update State in DynamoDB
				newStatus := oldStatus
				if eventType == "ORDER_FILLED" {
					newStatus = model.OrderStatusFilled
				} else if eventType == "ORDER_CANCELED" {
					newStatus = model.OrderStatusCanceled
				} else if eventType == "ORDER_LIVE" {
					newStatus = model.OrderStatusLive
				}

				if newStatus != oldStatus {
					updateOrderStatus(ctx, report.OrderID, newStatus, report.CumQty, report.AvgPx)
					log.Printf("[OMS] ✅ STATE TRANSITION: order_id=%s %s → %s", report.OrderID, oldStatus, newStatus)
				}

				// Emit Event to orders.events topic
				event := model.OrderEvent{
					EventID:   uuid.New().String(),
					OrderID:   report.OrderID,
					Type:      eventType,
					Payload:   report,
					Timestamp: time.Now().UTC(),
				}
				eventBytes, _ := json.Marshal(event)
				if err := producer.Produce(ctx, []byte(report.OrderID), eventBytes); err != nil {
					log.Printf("[OMS] ❌ FAILED to emit event: type=%s order_id=%s error=%v", eventType, report.OrderID, err)
				} else {
					log.Printf("[OMS] ✅ EMITTED EVENT: type=%s order_id=%s to topic=%s", eventType, report.OrderID, topicEvents)
				}
			}
			return nil
		})
		if err != nil {
			log.Printf("[OMS] Exec consumer failed: %v", err)
		}
	}()

	// Command consumer - this BLOCKS, so exec consumer must be started before this
	log.Println("[OMS] Starting Orders Commands consumer...")
	err = consumer.Consume(ctx, func(ctx context.Context, msg kafka.Message) error {
		var cmd model.OrderCommand
		if err := json.Unmarshal(msg.Value, &cmd); err != nil {
			log.Printf("[OMS] Error unmarshalling command: %v", err)
			return nil // commit bad message
		}

		log.Printf("[OMS] Processing command: type=%s order_id=%s symbol=%s side=%s qty=%f px=%f",
			cmd.Type, cmd.OrderID, cmd.Symbol, cmd.Side, cmd.QuantityVal, cmd.Price)

		// 1. Load State from DynamoDB
		currentStatus, getErr := getOrderStatus(ctx, cmd.OrderID)
		sm := fsm.NewStateMachine()
		if getErr == nil {
			sm.State = currentStatus
		}

		// 2. Process Command
		var eventType string
		var execType string
		var execStatus model.OrderStatus

		switch cmd.Type {
		case model.CommandTypeNew:
			if err := sm.CanTransition(model.OrderStatusPendingSubmit); err != nil {
				log.Printf("[OMS] Invalid transition: %v", err)
				// Send Reject Exec Report
				sendExecReport(execProducer, cmd, "REJECTED", model.OrderStatusRejected, err.Error())
				return nil
			}
			eventType = "ORDER_CREATED"
			execType = "NEW"
			execStatus = model.OrderStatusPendingSubmit

		case model.CommandTypeCancel:
			if err := sm.CanTransition(model.OrderStatusCanceled); err != nil {
				if err := sm.CanTransition(model.OrderStatusCancelPending); err != nil {
					log.Printf("[OMS] Cannot cancel: %v", err)
					return nil
				}
			}
			eventType = "ORDER_CANCEL_REQUESTED"
			execType = "PENDING_CANCEL"
			execStatus = model.OrderStatusCancelPending
		}

		if eventType != "" {
			// Update state in DynamoDB
			if eventType == "ORDER_CREATED" {
				createOrder(ctx, cmd)
			}

			// Produce Event (Canonical State)
			event := model.OrderEvent{
				EventID:   uuid.New().String(),
				OrderID:   cmd.OrderID,
				Type:      eventType,
				Payload:   cmd,
				Timestamp: time.Now().UTC(),
			}

			eventBytes, _ := json.Marshal(event)
			if err := producer.Produce(ctx, []byte(cmd.OrderID), eventBytes); err != nil {
				log.Printf("[OMS] Failed to produce event: %v", err)
				return err
			}

			log.Printf("[OMS] Emitted event: type=%s order_id=%s to topic=%s", eventType, cmd.OrderID, topicEvents)

			// Produce Exec Report (for UI)
			sendExecReport(execProducer, cmd, execType, execStatus, "")
		}

		return nil
	})

	if err != nil {
		log.Fatal("[OMS] Command consumer failed:", err)
	}
}

func getOrderStatus(ctx context.Context, orderID string) (model.OrderStatus, error) {
	result, err := dynamoClient.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(awsCfg.OrdersTable),
		Key:       map[string]types.AttributeValue{"order_id": &types.AttributeValueMemberS{Value: orderID}},
	})
	if err != nil {
		log.Printf("[DDB-ERROR] GetItem Table=%s Key=%s Error=%v", awsCfg.OrdersTable, orderID, err)
		return "", err
	}
	if result.Item == nil {
		return "", errors.New("not found")
	}
	var order struct {
		Status string `dynamodbav:"status"`
	}
	if err := attributevalue.UnmarshalMap(result.Item, &order); err != nil {
		return "", err
	}
	return model.OrderStatus(order.Status), nil
}

func handleDebugDDB(w http.ResponseWriter, r *http.Request) {
	status := "OK"
	_, err := dynamoClient.DescribeTable(context.Background(), &dynamodb.DescribeTableInput{
		TableName: aws.String(awsCfg.OrdersTable),
	})
	if err != nil {
		status = fmt.Sprintf("FAIL: %v", err)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"service":           "oms-core",
		"region":            awsCfg.Region,
		"orders_table":      awsCfg.OrdersTable,
		"endpoint_override": awsCfg.DynamoDBEndpoint,
		"use_ddb_local":     awsCfg.UseLocalDDB,
		"ddb_status":        status,
	})
}

func createOrder(ctx context.Context, cmd model.OrderCommand) {
	log.Printf("[OMS] Persisting new order %s to DynamoDB for account %s", cmd.OrderID, cmd.ClientID)

	item, err := attributevalue.MarshalMap(map[string]interface{}{
		"order_id":   cmd.OrderID,
		"account_id": cmd.ClientID, // Use ClientID as authoritative account identifier
		"symbol":     cmd.Symbol,
		"side":       string(cmd.Side),
		"price":      cmd.Price,
		"order_qty":  cmd.QuantityVal,
		"cum_qty":    0.0,
		"leaves_qty": cmd.QuantityVal,
		"avg_px":     0.0,
		"last_px":    0.0,
		"status":     string(model.OrderStatusPendingSubmit),
		"created_at": time.Now().Unix(),
		"updated_at": time.Now().Unix(),
	})
	if err != nil {
		log.Printf("[OMS-ERROR] Failed to marshal order %s: %v", cmd.OrderID, err)
		return
	}

	_, err = dynamoClient.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(awsCfg.OrdersTable),
		Item:      item,
	})
	if err != nil {
		log.Printf("[DDB-WRITE-ERROR] Table=%s Key=%s Error=%v", awsCfg.OrdersTable, cmd.OrderID, err)
	} else {
		log.Printf("[DDB-WRITE-SUCCESS] Table=%s Key=%s (New Order created)", awsCfg.OrdersTable, cmd.OrderID)
	}
}

func updateOrderStatus(ctx context.Context, orderID string, status model.OrderStatus, cumQty float64, avgPrice float64) {
	log.Printf("[OMS] Updating order %s status to %s (cum_qty=%f, avg_px=%f) in DynamoDB", orderID, status, cumQty, avgPrice)

	_, err := dynamoClient.UpdateItem(ctx, &dynamodb.UpdateItemInput{
		TableName:                aws.String(awsCfg.OrdersTable),
		Key:                      map[string]types.AttributeValue{"order_id": &types.AttributeValueMemberS{Value: orderID}},
		UpdateExpression:         aws.String("SET #s = :s, cum_qty = :cq, avg_px = :ap, updated_at = :u"),
		ExpressionAttributeNames: map[string]string{"#s": "status"},
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":s":  &types.AttributeValueMemberS{Value: string(status)},
			":cq": &types.AttributeValueMemberN{Value: fmt.Sprintf("%f", cumQty)},
			":ap": &types.AttributeValueMemberN{Value: fmt.Sprintf("%f", avgPrice)},
			":u":  &types.AttributeValueMemberN{Value: fmt.Sprintf("%d", time.Now().Unix())},
		},
	})
	if err != nil {
		log.Printf("[DDB-WRITE-ERROR] Table=%s Key=%s Error=%v", awsCfg.OrdersTable, orderID, err)
	} else {
		log.Printf("[DDB-WRITE-SUCCESS] Table=%s Key=%s (Status updated to %s)", awsCfg.OrdersTable, orderID, status)
	}
}

func sendExecReport(p *kafka.Producer, cmd model.OrderCommand, execType string, status model.OrderStatus, reason string) {
	report := model.ExecutionReport{
		ExecID:    uuid.New().String(),
		OrderID:   cmd.OrderID,
		ClientID:  cmd.ClientID,
		Symbol:    cmd.Symbol,
		Side:      cmd.Side,
		OrderQty:  cmd.QuantityVal,
		Price:     cmd.Price,
		Type:      execType,
		Status:    status,
		Timestamp: time.Now().UTC(),
		Reason:    reason,
	}
	if status == model.OrderStatusNew || status == model.OrderStatusPendingSubmit {
		report.LeavesQty = cmd.QuantityVal
	}

	bytes, _ := json.Marshal(report)
	p.Produce(context.Background(), []byte(cmd.OrderID), bytes)
}
