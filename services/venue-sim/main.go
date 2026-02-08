package main

import (
	"context"
	"encoding/json"
	"log"
	"math/rand"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/atlas/services/common/kafka"
	"github.com/atlas/services/common/model"
	"github.com/google/uuid"
)

var (
	kafkaBrokers    = []string{"localhost:19092"}
	topicEvents     = "orders.events"
	topicExecs      = "exec.reports"
	topicMarketData = "market.data"
)

// MarketState holds the current market price for symbols
type MarketState struct {
	sync.RWMutex
	Prices map[string]float64
}

func main() {
	producer := kafka.NewProducer(kafkaBrokers, topicExecs)
	defer producer.Close()

	mdProducer := kafka.NewProducer(kafkaBrokers, topicMarketData)
	defer mdProducer.Close()

	consumer := kafka.NewConsumer(kafkaBrokers, topicEvents, "venue-sim-group-v6")
	defer consumer.Close()

	log.Println("Venue Sim started...")

	// Initialize Market State
	marketState := &MarketState{
		Prices: map[string]float64{
			"BTC-USD": 50000.0,
			"ETH-USD": 3000.0,
			"SOL-USD": 100.0,
		},
	}

	// Handle graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Deduplication State
	processedOrders := make(map[string]bool)
	var processedMu sync.Mutex

	go func() {
		sig := make(chan os.Signal, 1)
		signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
		<-sig
		cancel()
	}()

	// Start Market Data Simulator
	go simulateMarketData(mdProducer, marketState)

	err := consumer.Consume(ctx, func(ctx context.Context, msg kafka.Message) error {
		var event model.OrderEvent
		if err := json.Unmarshal(msg.Value, &event); err != nil {
			log.Printf("Error unmarshalling event: %v", err)
			return nil
		}

		if event.Type == "ORDER_CREATED" {
			// Parse payload to get order details
			payloadBytes, _ := json.Marshal(event.Payload)
			var cmd model.OrderCommand
			if err := json.Unmarshal(payloadBytes, &cmd); err != nil {
				log.Printf("Unmarshall error: %v", err)
				return nil
			}

			// DEDUPLICATION
			processedMu.Lock()
			if processedOrders[cmd.OrderID] {
				processedMu.Unlock()
				log.Printf("[VENUE] Duplicate Order %s ignored.", cmd.OrderID)
				return nil
			}
			processedOrders[cmd.OrderID] = true
			processedMu.Unlock()

			// 0. Log received order
			log.Printf("[VENUE] Received Order: ID=%s Side=%s Qty=%f Px=%f Symbol=%s Account=%s",
				cmd.OrderID, cmd.Side, cmd.QuantityVal, cmd.Price, cmd.Symbol, cmd.ClientID)

			// 1. Send Accepted (LIVE) immediately
			sendExec(producer, cmd, "NEW", model.OrderStatusLive, 0, 0)

			// 2. Check for Immediate Match against current market
			marketState.RLock()
			currentPrice, ok := marketState.Prices[cmd.Symbol]
			marketState.RUnlock()

			if !ok {
				log.Printf("[VENUE] Unknown symbol %s, ignoring match", cmd.Symbol)
				return nil
			}

			// Generate Spread for Matching Context
			spread := currentPrice * 0.0002
			bestAsk := currentPrice + spread
			bestBid := currentPrice - spread

			log.Printf("[VENUE] MATCH CHECK: %s. OrderPx: %f. Market: Bid=%f, Ask=%f",
				cmd.Symbol, cmd.Price, bestBid, bestAsk)

			// Matching Logic
			matched := false
			fillPrice := currentPrice // Default fallback

			if cmd.Side == model.OrderSideBuy {
				// BUY fills if Price >= BestAsk
				// Fill at BestAsk (Market Price)
				if cmd.Price >= bestAsk {
					matched = true
					fillPrice = bestAsk
					log.Printf("[VENUE] BUY MATCHED! %f >= %f. Fill @ %f", cmd.Price, bestAsk, fillPrice)
				} else {
					log.Printf("[VENUE] BUY RESTING. %f < %f", cmd.Price, bestAsk)
				}
			} else {
				// SELL fills if Price <= BestBid
				// Fill at BestBid (Market Price)
				if cmd.Price <= bestBid {
					matched = true
					fillPrice = bestBid
					log.Printf("[VENUE] SELL MATCHED! %f <= %f. Fill @ %f", cmd.Price, bestBid, fillPrice)
				} else {
					log.Printf("[VENUE] SELL RESTING. %f > %f", cmd.Price, bestBid)
				}
			}

			if matched {
				log.Printf("Order %s MATCHED! Limit: %f, Market: %f. Filling...", cmd.OrderID, cmd.Price, fillPrice)
				// Simulate latency
				time.Sleep(time.Duration(rand.Intn(200)+50) * time.Millisecond)

				// Send Filled
				sendExec(producer, cmd, "TRADE", model.OrderStatusFilled, cmd.QuantityVal, fillPrice)
			} else {
				log.Printf("Order %s resting in book. Limit: %f, Market: %f", cmd.OrderID, cmd.Price, currentPrice)
			}
		}

		return nil
	})

	if err != nil {
		log.Fatal(err)
	}
}

func sendExec(p *kafka.Producer, cmd model.OrderCommand, execType string, status model.OrderStatus, fillQty float64, fillPx float64) {
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
	}

	if status == model.OrderStatusFilled {
		report.LastQty = fillQty
		report.CumQty = fillQty
		report.LeavesQty = 0
		report.LastPx = fillPx
		report.AvgPx = fillPx
	} else if status == model.OrderStatusLive {
		report.LeavesQty = cmd.QuantityVal
	}

	bytes, _ := json.Marshal(report)
	log.Printf("[VENUE] Publishing exec report: order_id=%s status=%s cum_qty=%f avg_px=%f to topic=%s",
		report.OrderID, report.Status, report.CumQty, report.AvgPx, topicExecs)

	if err := p.Produce(context.Background(), []byte(cmd.OrderID), bytes); err != nil {
		log.Printf("[VENUE] ❌ FAILED to publish exec report: order_id=%s error=%v", report.OrderID, err)
	} else {
		log.Printf("[VENUE] ✅ EXEC REPORT EMITTED: order_id=%s status=%s to topic=%s",
			report.OrderID, report.Status, topicExecs)
	}
}

func simulateMarketData(p *kafka.Producer, state *MarketState) {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	symbols := []string{"BTC-USD", "ETH-USD", "SOL-USD"}

	for range ticker.C {
		for _, sym := range symbols {
			state.Lock()
			base := state.Prices[sym]
			// 1. Random Walk
			change := (rand.Float64() - 0.5) * (base * 0.002) // 0.2% volatility
			base += change
			state.Prices[sym] = base
			currentPrice := base
			state.Unlock()

			// Generate L2 (Spread around current price)
			spread := currentPrice * 0.0002
			bestAsk := currentPrice + spread
			bestBid := currentPrice - spread

			l2 := model.MarketDataUpdate{
				Type:      model.MarketDataTypeL2,
				Symbol:    sym,
				Timestamp: time.Now().UTC(),
				Bids: []model.PriceLevel{
					{Price: bestBid, Qty: rand.Float64() * 5},
					{Price: bestBid - (currentPrice * 0.0005), Qty: rand.Float64() * 10},
					{Price: bestBid - (currentPrice * 0.0010), Qty: rand.Float64() * 20},
				},
				Asks: []model.PriceLevel{
					{Price: bestAsk, Qty: rand.Float64() * 5},
					{Price: bestAsk + (currentPrice * 0.0005), Qty: rand.Float64() * 10},
					{Price: bestAsk + (currentPrice * 0.0010), Qty: rand.Float64() * 20},
				},
			}
			sendMarketData(p, l2)

			// 2. Randomly Generate Trade (noise)
			if rand.Float64() > 0.7 {
				side := "BUY"
				tradePx := bestAsk
				if rand.Float64() > 0.5 {
					side = "SELL"
					tradePx = bestBid
				}
				trade := model.MarketDataUpdate{
					Type:      model.MarketDataTypeTrade,
					Symbol:    sym,
					Timestamp: time.Now().UTC(),
					Trade: &model.TradeInfo{
						Price: tradePx,
						Qty:   rand.Float64() * 2,
						Side:  side,
					},
				}
				sendMarketData(p, trade)
			}
		}
	}
}

func sendMarketData(p *kafka.Producer, data model.MarketDataUpdate) {
	bytes, _ := json.Marshal(data)
	// Key by symbol to ensure ordering if partitioned
	p.Produce(context.Background(), []byte(data.Symbol), bytes)
}
