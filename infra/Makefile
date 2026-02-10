.PHONY: bootstrap up down services ui test clean help

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

bootstrap: ## Install dependencies and setup tools
	@echo "Bootstrapping..."
	cd ../services && go work init
	cd ../services/order-gateway && go mod init github.com/atlas/services/order-gateway
	cd ../services/oms-core && go mod init github.com/atlas/services/oms-core
	cd ../services/pretrade-controls && go mod init github.com/atlas/services/pretrade-controls
	cd ../services/venue-sim && go mod init github.com/atlas/services/venue-sim
	cd ../services/audit-sink && go mod init github.com/atlas/services/audit-sink
	cd ../services/policy-service && go mod init github.com/atlas/services/policy-service
	cd ../services/ai-explain && go mod init github.com/atlas/services/ai-explain
	cd ../services && go work use ./order-gateway ./oms-core ./pretrade-controls ./venue-sim ./audit-sink ./policy-service ./ai-explain
	
up: ## Start infrastructure
	docker-compose up -d

down: ## Stop infrastructure
	docker-compose down

services: ## Build and start backend services
	@echo "Building services..."
	# Placeholder for building services

ui: ## Start UI
	@echo "Starting UI..."
	cd ../apps/atlas-console && npm run dev


test: ## Run tests
	@echo "Running tests..."
	cd ../services && go test ./...

aws-up: ## Start ATLAS in AWS Mode (DynamoDB + S3) - Foreground
	@echo "Starting ATLAS in AWS Mode..."
	export AWS_REGION=us-east-1; \
	export ATLAS_DDB_BALANCES_TABLE=atlas_balances; \
	export ATLAS_DDB_ORDERS_TABLE=atlas_orders; \
	export ATLAS_DDB_IDEMPOTENCY_TABLE=atlas_idempotency; \
	export ATLAS_AUDIT_S3_BUCKET=atlas-audit-demo; \
	$(MAKE) up; \
	echo "Starting backend services in foreground..."; \
	tmux new-session -d -s atlas-aws \
		"cd ../services/order-gateway && go run main.go" \; \
		split-window -v "cd ../services/oms-core && go run main.go" \; \
		split-window -h "cd ../services/venue-sim && go run main.go" \; \
		split-window -v "cd ../services/audit-exporter && go run main.go" \; \
		attach-session -t atlas-aws

aws-up-bg: ## Start ATLAS in AWS Mode (DynamoDB + S3) - Background
	@echo "Starting ATLAS in AWS Mode (Background)..."
	export AWS_REGION=us-east-1; \
	export ATLAS_DDB_BALANCES_TABLE=atlas_balances; \
	export ATLAS_DDB_ORDERS_TABLE=atlas_orders; \
	export ATLAS_DDB_IDEMPOTENCY_TABLE=atlas_idempotency; \
	export ATLAS_AUDIT_S3_BUCKET=atlas-audit-demo; \
	$(MAKE) up; \
	cd ../services/order-gateway && go run main.go > ../../tmp/order-gateway.log 2>&1 & \
	cd ../services/oms-core && go run main.go > ../../tmp/oms-core.log 2>&1 & \
	cd ../services/venue-sim && go run main.go > ../../tmp/venue-sim.log 2>&1 & \
	cd ../services/audit-exporter && go run main.go > ../../tmp/audit-exporter.log 2>&1 & \
	echo "Services started in background. Logs in infra/tmp/*.log"
	@echo "URLs: Console: http://localhost:5173"
	@echo "Run verification: ./scripts/aws_verify.sh"

clean: ## Clean up artifacts
	rm -rf tmp
