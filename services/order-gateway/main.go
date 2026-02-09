package main

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/atlas/services/common/kafka"
	"github.com/atlas/services/common/model"
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

	// Balance Manager State (Default demo values)
	initialUSD = 1000000.0
	initialBTC = 50.0

	accounts = map[string]*model.Account{
		"ACC_CHILD_1": {
			USD: model.Balance{Available: initialUSD, Reserved: 0.0},
			BTC: model.Balance{Available: initialBTC, Reserved: 0.0},
		},
	}
	accMu sync.Mutex
)

func main() {
	// Initialize Kafka Producer
	producer = kafka.NewProducer(kafkaBrokers, topicCommands)
	defer producer.Close()

	// Start Kafka Consumer for Exec Reports (to broadcast to WS + Update Balances)
	go startConsumer()
	go startMarketDataConsumer()

	// Start WebSocket hub
	go handleMessages()

	// HTTP Server
	mux := http.NewServeMux()
	mux.HandleFunc("/orders", enableCors(handleOrderEntry))
	mux.HandleFunc("/balances", enableCors(handleBalances)) // New Endpoint
	mux.HandleFunc("/ws", handleWebSocket)
	mux.HandleFunc("/health", enableCors(handleHealth))

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

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}
}

func handleBalances(w http.ResponseWriter, r *http.Request) {
	accountID := r.URL.Query().Get("account_id")
	if accountID == "" {
		accountID = "ACC_CHILD_1" // Default for demo
	}

	accMu.Lock()
	defer accMu.Unlock()

	acc, exists := accounts[accountID]
	if !exists {
		log.Printf("[GATEWAY] Initializing new account: %s", accountID)
		acc = &model.Account{
			USD: model.Balance{Available: initialUSD, Reserved: 0.0},
			BTC: model.Balance{Available: initialBTC, Reserved: 0.0},
		}
		accounts[accountID] = acc
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(acc)
}

func handleOrderEntry(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Read body to string for debugging
	bodyBytes, _ := io.ReadAll(r.Body)
	log.Printf("Raw Body: %s", string(bodyBytes))
	// Restore body for decoder
	r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

	var cmd model.OrderCommand
	if err := json.NewDecoder(r.Body).Decode(&cmd); err != nil {
		log.Printf("Decode Error: %v", err)
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	log.Printf("[GATEWAY] Received order: order_id=%s symbol=%s side=%s qty=%f px=%f",
		cmd.OrderID, cmd.Symbol, cmd.Side, cmd.QuantityVal, cmd.Price)

	// Enrich command
	if cmd.CommandID == "" {
		cmd.CommandID = uuid.New().String()
	}
	if cmd.OrderID == "" {
		cmd.OrderID = uuid.New().String()
	}
	if cmd.Timestamp.IsZero() {
		cmd.Timestamp = time.Now().UTC()
	}

	// PRE-TRADE CHECK & RESERVATION
	// For demo, assume single account
	accountID := "ACC_CHILD_1"
	accMu.Lock()
	acc, ok := accounts[accountID]
	if !ok {
		log.Printf("[GATEWAY] Initializing new account during order: %s", accountID)
		acc = &model.Account{
			USD: model.Balance{Available: initialUSD, Reserved: 0.0},
			BTC: model.Balance{Available: initialBTC, Reserved: 0.0},
		}
		accounts[accountID] = acc
	}

	if cmd.Side == model.OrderSideBuy {
		cost := cmd.QuantityVal * cmd.Price
		if acc.USD.Available < cost {
			accMu.Unlock()
			log.Printf("Rejected BUY: Insufficient Funds. Req: %f, Avail: %f", cost, acc.USD.Available)
			http.Error(w, "Insufficient Funds", http.StatusBadRequest)
			return
		}
		acc.USD.Available -= cost
		acc.USD.Reserved += cost
	} else {
		qty := cmd.QuantityVal
		if acc.BTC.Available < qty {
			accMu.Unlock()
			log.Printf("Rejected SELL: Insufficient Asset. Req: %f, Avail: %f", qty, acc.BTC.Available)
			http.Error(w, "Insufficient Asset", http.StatusBadRequest)
			return
		}
		acc.BTC.Available -= qty
		acc.BTC.Reserved += qty
	}
	accMu.Unlock()
	log.Printf("Order Accepted. Balances Updated.")

	// Send to Kafka
	key := []byte(cmd.OrderID)
	value, _ := json.Marshal(cmd)

	// Create context with timeout for Kafka write
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	if err := producer.Produce(ctx, key, value); err != nil {
		log.Printf("[GATEWAY] Failed to produce order_id=%s to Kafka: %v", cmd.OrderID, err)
		// Undo reservation on failure
		accMu.Lock()
		if cmd.Side == model.OrderSideBuy {
			cost := cmd.QuantityVal * cmd.Price
			acc.USD.Available += cost
			acc.USD.Reserved -= cost
		} else {
			acc.BTC.Available += cmd.QuantityVal
			acc.BTC.Reserved -= cmd.QuantityVal
		}
		accMu.Unlock()

		http.Error(w, "Failed to submit order", http.StatusInternalServerError)
		return
	}

	log.Printf("[GATEWAY] Order submitted to Kafka: order_id=%s topic=%s", cmd.OrderID, topicCommands)
	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(map[string]string{"status": "accepted", "order_id": cmd.OrderID, "command_id": cmd.CommandID})
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

	// Keep connection alive, maybe implement ping/pong later
	// For now just wait until close
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
		// Update Balances based on executions
		var report model.ExecutionReport
		if err := json.Unmarshal(msg.Value, &report); err == nil {
			updateBalances(report)
		}

		log.Printf("[GATEWAY] Received exec report: order_id=%s status=%s filled=%f avg_px=%f",
			report.OrderID, report.Status, report.CumQty, report.AvgPx)

		// Just forward the message to all connected clients
		mu.Lock()
		numClients := len(clients)
		mu.Unlock()

		log.Printf("[GATEWAY] 📡 Broadcasting exec report to %d WebSocket client(s): order_id=%s status=%s",
			numClients, report.OrderID, report.Status)
		broadcast <- msg.Value
		return nil
	})

	if err != nil {
		log.Fatal("Consumer failed:", err)
	}
}

func updateBalances(report model.ExecutionReport) {
	// For demo MVP, we only care about account ACC_CHILD_1
	// In real app, account ID would be on the order
	accountID := "ACC_CHILD_1"

	accMu.Lock()
	defer accMu.Unlock()

	acc, ok := accounts[accountID]
	if !ok {
		return
	}

	// Handle Settlement
	if report.Status == model.OrderStatusFilled || report.Status == model.OrderStatusPartiallyFilled {
		// Idempotency Check
		if acc.ProcessedIds == nil {
			acc.ProcessedIds = make(map[string]bool)
		}
		if acc.ProcessedIds[report.ExecID] {
			log.Printf("Skipping duplicate settlement for ExecID: %s", report.ExecID)
			return
		}
		acc.ProcessedIds[report.ExecID] = true

		fillQty := report.LastQty
		fillPx := report.LastPx

		if fillQty <= 0 {
			return
		}

		// LIMIT PRICE lookup is required for correct BUY settlement (refunds)
		// We trust report.Price is populated with the original Limit Price
		limitPx := report.Price
		if limitPx == 0 {
			// Fallback: If for some reason Limit Px is missing, use Fill Px (no refund)
			limitPx = fillPx
			log.Printf("WARNING: Missing Limit Price in Report for Order %s. Using FillPx for settlement.", report.OrderID)
		}

		if report.Side == model.OrderSideBuy {
			// BUY SETTLEMENT
			// 1. Release Reservation (Cost at Limit Price)
			reservedAmount := fillQty * limitPx
			acc.USD.Reserved -= reservedAmount

			// 2. Calculate Actual Cost
			actualCost := fillQty * fillPx

			// 3. Refund Difference (if Limit > Fill) to Available
			// Logic: We took 'reservedAmount' from Available. We only spent 'actualCost'.
			// So we return (reservedAmount - actualCost) to Available.
			// Net change to Available = -actualCost + (Limit - Fill)*Qty ??
			// No, simpler: Available was already deduced by Reserve.
			// Now we just give back the over-reserved amount.
			// Wait, "Available" should NOT increase by cost.
			// Initial: Avail = 100, Res = 0.
			// Reserve 50: Avail = 50, Res = 50.
			// Fill 50 @ 40 (Cost 2000). Reserved was 50*1 (if limit=1? no limit=50).
			// Example: Buy 1 BTC @ 50k. Avail=50k, Res=50k.
			// Fill 1 BTC @ 49k. Actual Cost = 49k.
			// Release Res: Res -= 50k (-> 0).
			// Refund: 50k - 49k = 1k. Avail += 1k (-> 51k). Total Eq = 51k + 1BTC. Correct.

			refund := reservedAmount - actualCost
			acc.USD.Available += refund

			// 4. Credit Asset
			acc.BTC.Available += fillQty

		} else {
			// SELL SETTLEMENT
			// 1. Release Reservation (Asset)
			acc.BTC.Reserved -= fillQty

			// 2. Credit Proceeds to USD Available
			proceeds := fillQty * fillPx
			acc.USD.Available += proceeds
		}

	} else if report.Status == model.OrderStatusCanceled || report.Status == model.OrderStatusRejected {
		// Idempotency Check for Cancels?
		// ExecIDs for cancels are also unique.
		if acc.ProcessedIds == nil {
			acc.ProcessedIds = make(map[string]bool)
		}
		if acc.ProcessedIds[report.ExecID] {
			log.Printf("Skipping duplicate release for ExecID: %s", report.ExecID)
			return
		}
		acc.ProcessedIds[report.ExecID] = true

		// RELEASE LEAVES
		leaves := report.LeavesQty
		if report.Status == model.OrderStatusRejected {
			leaves = report.OrderQty
		}

		if leaves > 0 {
			if report.Side == model.OrderSideBuy {
				// Refund USD Reservation
				limitPx := report.Price
				acc.USD.Reserved -= leaves * limitPx
				acc.USD.Available += leaves * limitPx
			} else {
				// Refund BTC Reservation
				acc.BTC.Reserved -= leaves
				acc.BTC.Available += leaves
			}
		}
	}

	// INVARIANT CHECKS
	if acc.USD.Reserved < 0 {
		log.Printf("[CRITICAL] Negative USD Reserved for %s: %f. Resetting to 0.", accountID, acc.USD.Reserved)
		acc.USD.Reserved = 0
	}
	if acc.BTC.Reserved < 0 {
		log.Printf("[CRITICAL] Negative BTC Reserved for %s: %f. Resetting to 0.", accountID, acc.BTC.Reserved)
		acc.BTC.Reserved = 0
	}
	if acc.USD.Available < 0 {
		log.Printf("[CRITICAL] Negative USD Available for %s: %f.", accountID, acc.USD.Available)
	}
	if acc.BTC.Available < 0 {
		log.Printf("[CRITICAL] Negative BTC Available for %s: %f.", accountID, acc.BTC.Available)
	}
}

func startMarketDataConsumer() {
	consumer := kafka.NewConsumer(kafkaBrokers, topicMarketData, "order-gateway-md-group")
	defer consumer.Close()

	log.Println("Started consumer for market.data")

	err := consumer.Consume(context.Background(), func(ctx context.Context, msg kafka.Message) error {
		// Broadcast market data to all clients
		broadcast <- msg.Value
		return nil
	})

	if err != nil {
		log.Printf("Market Data Consumer failed: %v", err)
	}
}

func enableCors(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		log.Printf("CORS Middleware: %s %s", r.Method, r.URL.Path)
		// Set CORS headers
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")

		// Handle preflight
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)
	}
}
