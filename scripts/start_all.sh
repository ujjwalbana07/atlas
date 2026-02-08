#!/bin/bash
# Quick Start Guide - Run all services and verify order fills

echo "=========================================="
echo "Atlas Trading Platform - Quick Start"
echo "=========================================="
echo ""

# Check if infrastructure is running
echo "1️⃣  Checking infrastructure..."
if ! docker ps | grep -q redpanda; then
  echo "❌ Redpanda not running. Starting infrastructure..."
  cd infra && docker compose up -d
  sleep 5
else
  echo "✅ Infrastructure running"
fi
echo ""

# Check if services are running
echo "2️⃣  Checking services..."
VENUE_PID=$(pgrep -f "venue-sim" | head -1)
OMS_PID=$(pgrep -f "oms-core" | head -1)
GW_PID=$(pgrep -f "order-gateway" | head -1)

if [ -z "$VENUE_PID" ] || [ -z "$OMS_PID" ] || [ -z "$GW_PID" ]; then
  echo "⚠️  Some services not running. Starting all services..."
  
  # Kill any existing processes
  pkill -f "venue-sim|oms-core|order-gateway" 2>/dev/null || true
  sleep 1
  
  # Start services
  cd services/venue-sim && nohup ./venue-sim > venue.log 2>&1 &
  cd ../oms-core && nohup ./oms-core > oms.log 2>&1 &
  cd ../order-gateway && nohup ./order-gateway > gateway.log 2>&1 &
  cd ../..
  
  echo "✅ Services started. Waiting for initialization..."
  sleep 3
else
  echo "✅ All services running"
  echo "   venue-sim: PID $VENUE_PID"
  echo "   oms-core: PID $OMS_PID"
  echo "   order-gateway: PID $GW_PID"
fi
echo ""

# Run smoke test
echo "3️⃣  Running E2E smoke test..."
./scripts/e2e_fill_test.sh
echo ""

# Show how to monitor logs
echo "=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
echo ""
echo "To monitor logs in real-time, open 3 terminals:"
echo ""
echo "Terminal 1 (Venue):"
echo "  tail -f services/venue-sim/venue.log"
echo ""
echo "Terminal 2 (OMS):"
echo "  tail -f services/oms-core/oms.log"
echo ""
echo "Terminal 3 (Gateway):"
echo "  tail -f services/order-gateway/gateway.log"
echo ""
echo "To test via UI:"
echo "1. Open Atlas Console in browser"
echo "2. Submit SELL order: BTC-USD, Qty=0.01, Price=1"
echo "3. Watch logs for complete execution flow"
echo ""
