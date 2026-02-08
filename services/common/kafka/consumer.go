package kafka

import (
	"context"
	"fmt"
	"log"

	"github.com/segmentio/kafka-go"
)

type Message = kafka.Message

type Consumer struct {
	reader *kafka.Reader
}

func NewConsumer(brokers []string, topic string, groupID string) *Consumer {
	r := kafka.NewReader(kafka.ReaderConfig{
		Brokers:     brokers,
		Topic:       topic,
		GroupID:     groupID,
		MinBytes:    1,                // 1B (Low latency for dev)
		MaxBytes:    10e6,             // 10MB
		StartOffset: kafka.LastOffset, // Start from end if no commit found
	})

	return &Consumer{reader: r}
}

func (c *Consumer) Consume(ctx context.Context, handler func(ctx context.Context, msg kafka.Message) error) error {
	for {
		m, err := c.reader.FetchMessage(ctx)
		if err != nil {
			return fmt.Errorf("failed to fetch message: %w", err)
		}

		if err := handler(ctx, m); err != nil {
			log.Printf("Error handling message: %v", err)
			continue
		}

		if err := c.reader.CommitMessages(ctx, m); err != nil {
			log.Printf("Failed to commit message: %v", err)
		}
	}
}

func (c *Consumer) Close() error {
	return c.reader.Close()
}
