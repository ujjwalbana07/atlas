#!/bin/bash
# Kafka Verification Script - Inspects Kafka topics and consumer groups
# Usage: ./scripts/verify_kafka.sh

echo "=========================================="
echo "Kafka Topic Verification"
echo "=========================================="
echo ""

echo "1️⃣  Listing all topics..."
docker exec -i redpanda rpk topic list
echo ""

echo "2️⃣  Checking consumer groups..."
docker exec -i redpanda rpk group list
echo ""

echo "3️⃣  Consumer group lag for exec.reports..."
docker exec -i redpanda rpk group describe oms-core-exec-group-v6 2>/dev/null || echo "   (Group not found or no lag)"
docker exec -i redpanda rpk group describe order-gateway-group-v6 2>/dev/null || echo "   (Group not found or no lag)"
echo ""

echo "4️⃣  Last 5 messages from exec.reports topic..."
echo "---"
docker exec -i redpanda rpk topic consume exec.reports -n 5 --format '%v\n' 2>/dev/null | tail -5 | jq -c '. | {order_id, status, cum_qty, avg_px, timestamp}'
echo ""

echo "5️⃣  Last 5 messages from orders.events topic..."
echo "---"
docker exec -i redpanda rpk topic consume orders.events -n 5 --format '%v\n' 2>/dev/null | tail -5 | jq -c '. | {order_id, type, timestamp}'
echo ""

echo "=========================================="
echo "✅ Kafka verification complete"
echo "=========================================="
