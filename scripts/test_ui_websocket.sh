#!/bin/bash

# Test UI WebSocket Connection and Order Fill Flow
# This script verifies that the UI can receive and display filled orders

echo "🧪 Testing UI WebSocket and Order Fill Display"
echo "=============================================="
echo ""

# Check if services are running
echo "1️⃣  Checking if order-gateway is running..."
if ! lsof -i :8001 > /dev/null 2>&1; then
    echo "❌ order-gateway is not running on port 8001"
    echo "   Please start it with: cd services/order-gateway && go run main.go"
    exit 1
fi
echo "✅ order-gateway is running"
echo ""

echo "2️⃣  Checking if Atlas Console UI is running..."
if ! lsof -i :5173 > /dev/null 2>&1; then
    echo "❌ Atlas Console is not running on port 5173"
    echo "   Please start it with: cd apps/atlas-console && npm run dev"
    exit 1
fi
echo "✅ Atlas Console is running"
echo ""

# Test WebSocket connection
echo "3️⃣  Testing WebSocket connection..."
echo "   Open your browser to: http://localhost:5173/console"
echo "   Open DevTools Console (F12) and look for:"
echo "   - 'Connected to Order Gateway WS (Context)'"
echo "   - '📨 Exec Report Received:' messages"
echo ""

# Submit a test order
echo "4️⃣  Submitting test SELL order at price=\$1..."
ORDER_ID="test-$(date +%s)"

curl -s -X POST http://localhost:8001/orders \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"NEW\",
    \"order_id\": \"$ORDER_ID\",
    \"client_id\": \"CLIENT_X\",
    \"symbol\": \"BTC-USD\",
    \"side\": \"SELL\",
    \"quantity\": 0.01,
    \"price\": 1.0
  }" > /dev/null

echo "✅ Order submitted: $ORDER_ID"
echo ""

# Wait for processing
echo "5️⃣  Waiting 3 seconds for order to fill..."
sleep 3
echo ""

# Check backend logs
echo "6️⃣  Checking backend logs for fill confirmation..."
if grep -q "order_id=$ORDER_ID.*FILLED" services/venue-sim/venue.log 2>/dev/null; then
    echo "✅ Venue-sim: Order FILLED"
else
    echo "⚠️  Venue-sim: No FILLED status found"
fi

if grep -q "order_id=$ORDER_ID.*FILLED" services/oms-core/oms.log 2>/dev/null; then
    echo "✅ OMS: Order FILLED"
else
    echo "⚠️  OMS: No FILLED status found"
fi

if grep -q "order_id=$ORDER_ID" services/order-gateway/gateway.log 2>/dev/null; then
    echo "✅ Gateway: Exec report received"
else
    echo "⚠️  Gateway: No exec report found"
fi
echo ""

# Instructions for UI verification
echo "7️⃣  UI Verification Steps:"
echo "   ================================"
echo "   In your browser console, you should see:"
echo ""
echo "   📨 Exec Report Received: {"
echo "      order_id: \"$ORDER_ID\","
echo "      status: \"FILLED\","
echo "      cum_qty: 0.01,"
echo "      avg_px: <market_price>"
echo "   }"
echo ""
echo "   ✅ Order Updated: {"
echo "      order_id: \"$ORDER_ID\","
echo "      old_status: \"LIVE\","
echo "      new_status: \"FILLED\","
echo "      old_filled: 0,"
echo "      new_filled: 0.01"
echo "   }"
echo ""
echo "   If you DON'T see these messages:"
echo "   - Check WebSocket connection status (should show 'Connected')"
echo "   - Reload the page and try again"
echo "   - Check browser console for errors"
echo ""

echo "✅ Test complete! Check your browser console and Live Orders table."
