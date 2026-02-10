package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/atlas/services/common/config"
	"github.com/atlas/services/common/kafka"
	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

var (
	kafkaBrokers = []string{"localhost:19092"}
	topics       = []string{"orders.events", "exec.reports"}
	awsCfg       *config.AWSConfig
)

func main() {
	// Load AWS Config
	awsCfg = config.LoadAWSConfig("audit-exporter")

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Handle graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigChan
		log.Println("Shutting down audit-exporter...")
		cancel()
	}()

	// Initialize S3 Client
	cfg, err := awsconfig.LoadDefaultConfig(ctx, awsconfig.WithRegion(awsCfg.Region))
	if err != nil {
		log.Fatalf("unable to load SDK config, %v", err)
	}
	s3Client := s3.NewFromConfig(cfg)

	log.Printf("Starting audit-exporter. Consuming topics: %v", topics)

	for _, topic := range topics {
		go consumeAndArchive(ctx, topic, s3Client)
	}

	<-ctx.Done()
	log.Println("audit-exporter stopped.")
}

func consumeAndArchive(ctx context.Context, topic string, s3Client *s3.Client) {
	consumer := kafka.NewConsumer(kafkaBrokers, topic, "audit-exporter-group-v2")
	defer consumer.Close()

	log.Printf("Consumer started for topic: %s", topic)

	err := consumer.Consume(ctx, func(ctx context.Context, msg kafka.Message) error {
		// Partitioning logic: dt=YYYY-MM-DD/topic=<topic_name>/part-timestamp.jsonl
		now := time.Now().UTC()
		dt := now.Format("2006-01-02")
		// Use partition and offset for idempotency (same message = same filename)
		filename := fmt.Sprintf("events/dt=%s/topic=%s/p=%d/offset=%d.jsonl",
			dt, topic, msg.Partition, msg.Offset)

		log.Printf("[AUDIT] Archiving event to S3 bucket: %s, key: %s", awsCfg.AuditS3Bucket, filename)

		_, err := s3Client.PutObject(ctx, &s3.PutObjectInput{
			Bucket: aws.String(awsCfg.AuditS3Bucket),
			Key:    aws.String(filename),
			Body:   strings.NewReader(string(msg.Value) + "\n"),
		})

		if err != nil {
			log.Printf("[ERROR] Failed to upload to S3: %v", err)
			return err // Kafka will retry based on consumer logic
		}

		return nil
	})

	if err != nil {
		log.Printf("Consumer for topic %s failed: %v", topic, err)
	}
}
