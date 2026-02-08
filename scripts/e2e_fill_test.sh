#!/bin/bash
# E2E Fill Test - Verifies order fill flow end-to-end
# Usage: ./scripts/e2e_fill_test.sh

set -e

echo "=========================================="
echo "E2E Order Fill Test"
echo "=========================================="
echo ""

# Generate unique order ID
ORDER_ID="test-$(date +%s)-$(uuidgen | cut -d'-' -f1)"
echo "📝 Test Order ID: $ORDER_ID"
echo ""

# Submit SELL order at price=1 (guaranteed to cross market)
echo "1️⃣  Submitting SELL order at price=1..."
RESPONSE=$(curl -s -X POST http://localhost:8001/orders \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"NEW\",
    \"order_id\": \"$ORDER_ID\",
    \"client_id\": \"ACC_CHILD_1\",
    \"symbol\": \"BTC-USD\",
    \"side\": \"SELL\",
    \"quantity\": 0.01,
    \"price\": 1.0
  }")

echo "Response: $RESPONSE"
echo ""

# Wait for processing
echo "2️⃣  Waiting 3 seconds for order processing..."
sleep 3
echo ""

# Check Kafka for exec report
echo "3️⃣  Checking exec.reports topic for FILLED status..."
EXEC_REPORTS=$(docker exec -i redpanda rpk topic consume exec.reports -n 20 --format '%v\n' 2>/dev/null | tail -20)

# Look for our order ID in the reports
if echo "$EXEC_REPORTS" | grep -q "\"order_id\":\"$ORDER_ID\""; then
  echo "✅ Found exec report for order $ORDER_ID"
  
  # Check if it's FILLED
  if echo "$EXEC_REPORTS" | grep "\"order_id\":\"$ORDER_ID\"" | grep -q "\"status\":\"FILLED\""; then
    echo "✅ Order status is FILLED"
    
    # Extract and display the fill details
    FILL_REPORT=$(echo "$EXEC_REPORTS" | grep "\"order_id\":\"$ORDER_ID\"" | grep "\"status\":\"FILLED\"" | tail -1)
    echo ""
    echo "📊 Fill Details:"
    echo "$FILL_REPORT" | jq -r '. | "   Order ID: \(.order_id)\n   Status: \(.status)\n   Filled Qty: \(.cum_qty)\n   Avg Price: \(.avg_px)\n   Symbol: \(.symbol)\n   Side: \(.side)"'
    echo ""
    echo "=========================================="
    echo "✅ PASS: Order filled successfully!"
    echo "=========================================="
    exit 0
  else
    echo "❌ Order found but status is not FILLED"
    echo ""
    echo "Exec reports for this order:"
    echo "$EXEC_REPORTS" | grep "\"order_id\":\"$ORDER_ID\""
    echo ""
    echo "=========================================="
    echo "❌ FAIL: Order did not fill"
    echo "=========================================="
    exit 1
  fi
else
  echo "❌ No exec report found for order $ORDER_ID"
  echo ""
  echo "Last 20 exec reports:"
  echo "$EXEC_REPORTS"
  echo ""
  echo "=========================================="
  echo "❌ FAIL: No exec report emitted"
  echo "=========================================="
  exit 1
fi
