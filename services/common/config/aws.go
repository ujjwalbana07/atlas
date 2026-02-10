package config

import (
	"log"
	"os"
	"strings"
)

type AWSConfig struct {
	Region           string
	BalancesTable    string
	OrdersTable      string
	IdempotencyTable string
	AuditS3Bucket    string
	DynamoDBEndpoint string
	UseLocalDDB      bool
}

func LoadAWSConfig(serviceName string) *AWSConfig {
	cfg := &AWSConfig{
		Region:           getEnv("AWS_REGION", "us-east-1"),
		BalancesTable:    getEnv("ATLAS_DDB_BALANCES_TABLE", "atlas_balances"),
		OrdersTable:      getEnv("ATLAS_DDB_ORDERS_TABLE", "atlas_orders"),
		IdempotencyTable: getEnv("ATLAS_DDB_IDEMPOTENCY_TABLE", "atlas_idempotency"),
		AuditS3Bucket:    getEnv("ATLAS_AUDIT_S3_BUCKET", "atlas-audit-demo"),
		DynamoDBEndpoint: os.Getenv("ATLAS_DDB_ENDPOINT"),
		UseLocalDDB:      strings.ToLower(os.Getenv("ATLAS_USE_DDB_LOCAL")) == "true",
	}

	// Logging startup info
	log.Printf("[%s] Starting with AWS Config:", serviceName)
	log.Printf("[%s]   Region: %s", serviceName, cfg.Region)
	log.Printf("[%s]   Balances Table: %s", serviceName, cfg.BalancesTable)
	log.Printf("[%s]   Orders Table: %s", serviceName, cfg.OrdersTable)
	log.Printf("[%s]   Idempotency Table: %s", serviceName, cfg.IdempotencyTable)
	log.Printf("[%s]   Audit S3 Bucket: %s", serviceName, cfg.AuditS3Bucket)

	endpointOverride := "false"
	if cfg.DynamoDBEndpoint != "" || cfg.UseLocalDDB {
		endpointOverride = "true"
		if cfg.DynamoDBEndpoint == "" && cfg.UseLocalDDB {
			cfg.DynamoDBEndpoint = "http://localhost:8000"
		}
		log.Printf("[%s]   Endpoint Override: %s (%s)", serviceName, endpointOverride, cfg.DynamoDBEndpoint)
	} else {
		log.Printf("[%s]   Endpoint Override: %s", serviceName, endpointOverride)
	}

	return cfg
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
