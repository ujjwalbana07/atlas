package main

import (
	"context"
	"encoding/json"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/atlas/services/common/kafka"
	"github.com/atlas/services/common/model"
	"github.com/atlas/services/oms-core/fsm"
	"github.com/google/uuid"
)

var (
	kafkaBrokers  = []string{"localhost:19092"}
	topicCommands = "orders.commands"
	topicEvents   = "orders.events"
	topicExecs    = "exec.reports"

	producer *kafka.Producer
	// In-memory state (for MVP, ideally backed by DynamoDB/Snapshots)
	orders = make(map[string]*fsm.StateMachine)
)

func main() {
	producer = kafka.NewProducer(kafkaBrokers, topicEvents)
	defer producer.Close()

	// We also need another producer for exec reports, or reuse with different topic?
	// The producer wrapper is per-topic (simple wrapper).
	// Let's create a second one or strictly follow event sourcing where Gateway listens to events?
	// Spec says "Exec reports" topic exists. OMS should produce to it.
	execProducer := kafka.NewProducer(kafkaBrokers, topicExecs)
	defer execProducer.Close()

	consumer := kafka.NewConsumer(kafkaBrokers, topicCommands, "oms-core-group-v6")
	defer consumer.Close()

	// Consumer for Exec Reports (from Venue)
	execConsumer := kafka.NewConsumer(kafkaBrokers, topicExecs, "oms-core-exec-group-v6")
	defer execConsumer.Close()

	log.Println("OMS Core started...")

	// Handle graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

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

			// Update state based on report
			sm, exists := orders[report.OrderID]
			if !exists {
				// Order may not exist if OMS restarted - just log and continue
				log.Printf("[OMS] ⚠️  WARNING: Order %s not found in memory (may have restarted or exec report arrived before ORDER_CREATED), skipping state update", report.OrderID)
				return nil
			}

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
				// Update State
				oldState := sm.State
				if eventType == "ORDER_FILLED" {
					sm.State = model.OrderStatusFilled
					log.Printf("[OMS] ✅ STATE TRANSITION: order_id=%s %s → FILLED (fill_qty=%f fill_px=%f)",
						report.OrderID, oldState, report.CumQty, report.AvgPx)
				} else if eventType == "ORDER_CANCELED" {
					sm.State = model.OrderStatusCanceled
					log.Printf("[OMS] STATE TRANSITION: order_id=%s %s → CANCELED", report.OrderID, oldState)
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
	err := consumer.Consume(ctx, func(ctx context.Context, msg kafka.Message) error {
		var cmd model.OrderCommand
		if err := json.Unmarshal(msg.Value, &cmd); err != nil {
			log.Printf("[OMS] Error unmarshalling command: %v", err)
			return nil // commit bad message
		}

		log.Printf("[OMS] Processing command: type=%s order_id=%s symbol=%s side=%s qty=%f px=%f",
			cmd.Type, cmd.OrderID, cmd.Symbol, cmd.Side, cmd.QuantityVal, cmd.Price)

		// 1. Load or Initialize State
		sm, exists := orders[cmd.OrderID]
		if !exists {
			sm = fsm.NewStateMachine()
			orders[cmd.OrderID] = sm
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
			// Update state
			if eventType == "ORDER_CREATED" {
				sm.State = model.OrderStatusPendingSubmit
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
	// Calculate leaves/cum for simple cases (NEW/REJECTED)
	if status == model.OrderStatusNew || status == model.OrderStatusPendingSubmit {
		report.LeavesQty = cmd.QuantityVal
	}

	bytes, _ := json.Marshal(report)
	p.Produce(context.Background(), []byte(cmd.OrderID), bytes)
}
