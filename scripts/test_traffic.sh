#!/bin/bash

# Configuration
GATEWAY_URL="http://localhost:8001"
echo "Sending test orders to $GATEWAY_URL..."

# Function to send an order
send_order() {
  local symbol=$1
  local side=$2
  local price=$3
  local qty=$4
  
  # Generate unique ID
  local id="ord-$(date +%s)-$(openssl rand -hex 2)"
  
  echo "Submitting $side $qty $symbol @ $price (ID: $id)"
  
  curl -s -X POST "$GATEWAY_URL/orders" \
    -H "Content-Type: application/json" \
    -d "{
      \"order_id\": \"$id\", 
      \"client_id\": \"client-test\", 
      \"symbol\": \"$symbol\", 
      \"side\": \"$side\", 
      \"quantity\": $qty, 
      \"price\": $price, 
      \"type\": \"NEW\"
    }"
  echo ""
}

# Send a mix of orders
send_order "BTC-USD" "BUY" 50000 100
sleep 1
send_order "ETH-USD" "SELL" 3000 50
sleep 1
send_order "BTC-USD" "SELL" 51000 25
sleep 1
send_order "SOL-USD" "BUY" 100 1000

echo "Done. Check the UI for updates."
