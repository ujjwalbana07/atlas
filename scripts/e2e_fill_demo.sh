#!/bin/bash
# =============================================================================
# ATLAS E2E Fill Demo Script
# =============================================================================
# Submits orders that MUST fill and verifies the pipeline works end-to-end.
# 
# Usage: ./scripts/e2e_fill_demo.sh
# =============================================================================

set -e

GATEWAY_URL="http://localhost:8001"
SYMBOL="BTC-USD"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}  ATLAS E2E Fill Demo${NC}"
echo -e "${BLUE}=======================================${NC}"
echo ""

# Check if gateway is running
echo -e "${YELLOW}[1/4] Checking Gateway health...${NC}"
if ! curl -s "${GATEWAY_URL}/health" > /dev/null 2>&1; then
    echo -e "${RED}ERROR: Gateway not responding at ${GATEWAY_URL}${NC}"
    echo "Please start services with:"
    echo "  cd /Users/ujjwal/Atlas/services/order-gateway && go run main.go &"
    echo "  cd /Users/ujjwal/Atlas/services/oms-core && go run main.go &"
    echo "  cd /Users/ujjwal/Atlas/services/venue-sim && go run main.go &"
    exit 1
fi
echo -e "${GREEN}✓ Gateway is healthy${NC}"
echo ""

# =============================================================================
# TEST 1: SELL Order at $1 (WAY below market, guaranteed to fill)
# =============================================================================
echo -e "${YELLOW}[2/4] Submitting SELL order at \$1 (must fill)...${NC}"
SELL_RESPONSE=$(curl -s -X POST "${GATEWAY_URL}/orders" \
    -H "Content-Type: application/json" \
    -d '{
        "type": "NEW",
        "symbol": "'"${SYMBOL}"'",
        "side": "SELL",
        "quantity": 0.001,
        "price": 1.0,
        "client_id": "ACC_CHILD_1"
    }')

echo "Response: ${SELL_RESPONSE}"
SELL_ORDER_ID=$(echo "${SELL_RESPONSE}" | grep -o '"order_id":"[^"]*"' | cut -d'"' -f4)
if [ -z "${SELL_ORDER_ID}" ]; then
    echo -e "${RED}ERROR: Failed to submit SELL order${NC}"
    exit 1
fi
echo -e "${GREEN}✓ SELL order submitted: ${SELL_ORDER_ID}${NC}"
echo ""

# =============================================================================
# TEST 2: BUY Order at $999999 (WAY above market, guaranteed to fill)
# =============================================================================
echo -e "${YELLOW}[3/4] Submitting BUY order at \$999999 (must fill)...${NC}"
BUY_RESPONSE=$(curl -s -X POST "${GATEWAY_URL}/orders" \
    -H "Content-Type: application/json" \
    -d '{
        "type": "NEW",
        "symbol": "'"${SYMBOL}"'",
        "side": "BUY",
        "quantity": 0.001,
        "price": 999999.0,
        "client_id": "ACC_CHILD_1"
    }')

echo "Response: ${BUY_RESPONSE}"
BUY_ORDER_ID=$(echo "${BUY_RESPONSE}" | grep -o '"order_id":"[^"]*"' | cut -d'"' -f4)
if [ -z "${BUY_ORDER_ID}" ]; then
    echo -e "${RED}ERROR: Failed to submit BUY order${NC}"
    exit 1
fi
echo -e "${GREEN}✓ BUY order submitted: ${BUY_ORDER_ID}${NC}"
echo ""

# =============================================================================
# Wait for processing
# =============================================================================
echo -e "${YELLOW}Waiting 3 seconds for pipeline processing...${NC}"
sleep 3

# =============================================================================
# Verify via Kafka
# =============================================================================
echo -e "${YELLOW}[4/4] Checking Kafka exec.reports topic...${NC}"
echo ""

# Try to consume recent messages from exec.reports
if command -v docker &> /dev/null; then
    echo -e "${BLUE}Recent exec.reports messages:${NC}"
    echo "---"
    docker exec -i redpanda rpk topic consume exec.reports -n 5 --format json 2>/dev/null | head -50 || echo "(Could not read Kafka topic)"
    echo "---"
else
    echo -e "${YELLOW}Docker not available, skipping Kafka verification${NC}"
fi

echo ""
echo -e "${BLUE}=======================================${NC}"
echo -e "${GREEN}  E2E Demo Complete!${NC}"
echo -e "${BLUE}=======================================${NC}"
echo ""
echo "Next steps:"
echo "1. Open http://localhost:5173/console in your browser"
echo "2. Check Live Orders table - orders should show:"
echo "   - Execution: CONFIRMED"
echo "   - OMS State: FILLED"
echo "   - Filled = Qty"
echo ""
echo "Order IDs to look for:"
echo "  SELL: ${SELL_ORDER_ID}"
echo "  BUY:  ${BUY_ORDER_ID}"
echo ""
