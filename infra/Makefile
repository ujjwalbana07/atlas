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

clean: ## Clean up artifacts
	rm -rf tmp
