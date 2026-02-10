#!/bin/zsh
set -euo pipefail

REGION="us-east-1"
GATEWAY_URL="http://localhost:8001/orders"
AUDIT_BUCKET="atlas-audit-demo"

echo "🔍 Starting ATLAS AWS verification..."

# 1. Confirm Identity
echo "--- Checking AWS Identity ---"
aws sts get-caller-identity >/dev/null
echo "✅ AWS Identity confirmed."

# 2. Check Service Runtime Config (Early Fail)
echo "--- Checking Service Runtime Configuration ---"

# Order Gateway Check
GW_DEBUG=$(curl -s http://localhost:8001/debug/ddb)
if [[ -z "$GW_DEBUG" ]]; then
    echo "❌ FAIL: Order Gateway not reachable on :8001"
    exit 1
fi
GW_REGION=$(echo "$GW_DEBUG" | grep -o '"region":"[^"]*"' | cut -d'"' -f4)
GW_STATUS=$(echo "$GW_DEBUG" | grep -o '"ddb_status":"[^"]*"' | cut -d'"' -f4)
GW_OVERRIDE=$(echo "$GW_DEBUG" | grep -o '"endpoint_override":"[^"]*"' | cut -d'"' -f4)

if [[ "$GW_REGION" != "us-east-1" || "$GW_STATUS" != "OK" || -n "$GW_OVERRIDE" ]]; then
    echo "❌ FAIL: Order Gateway misconfigured for AWS. Debug: $GW_DEBUG"
    exit 1
fi
echo "✅ Order Gateway correctly wired to AWS ($GW_REGION)."

# OMS Core Check
OMS_DEBUG=$(curl -s http://localhost:8002/debug/ddb)
if [[ -z "$OMS_DEBUG" ]]; then
    echo "❌ FAIL: OMS Core debug server not reachable on :8002"
    exit 1
fi
OMS_REGION=$(echo "$OMS_DEBUG" | grep -o '"region":"[^"]*"' | cut -d'"' -f4)
OMS_STATUS=$(echo "$OMS_DEBUG" | grep -o '"ddb_status":"[^"]*"' | cut -d'"' -f4)

if [[ "$OMS_REGION" != "us-east-1" || "$OMS_STATUS" != "OK" ]]; then
    echo "❌ FAIL: OMS Core misconfigured for AWS. Debug: $OMS_DEBUG"
    exit 1
fi
echo "✅ OMS Core correctly wired to AWS ($OMS_REGION)."

# 3. Check DynamoDB Tables
echo "--- Checking DynamoDB Tables ---"
TABLES_TEXT="$(aws dynamodb list-tables --region "$REGION" --query 'TableNames' --output text)"

if [[ "$TABLES_TEXT" == *"atlas_balances"* && "$TABLES_TEXT" == *"atlas_orders"* && "$TABLES_TEXT" == *"atlas_idempotency"* ]]; then
  echo "✅ DynamoDB atlas tables found."
else
  echo "❌ FAIL: One or more atlas tables not found in $REGION."
  echo "Found: $TABLES_TEXT"
  exit 1
fi

# 4. Test Order Flow
ORDER_ID="ord-aws-verify-$(date +%s)"
CLIENT_ID="client-x"
echo "--- Testing Order Flow via Gateway (ID: $ORDER_ID) ---"
curl -s -X POST http://localhost:8001/orders \
  -H "Content-Type: application/json" \
  -d '{"order_id":"'$ORDER_ID'","client_id":"'$CLIENT_ID'","symbol":"BTC-USD","side":"BUY","quantity":0.1,"price":50000,"type":"NEW"}' > /dev/null

if [ $? -ne 0 ]; then
    echo "❌ FAIL: Order Gateway (port 8001) not reachable."
    exit 1
fi
echo "✅ Order submitted successfully."

# 4. Wait for processing
echo "⏳ Waiting 3 seconds for state to sync to DynamoDB and S3..."
sleep 3

# 5. Verify DynamoDB Data
echo "--- Verifying DynamoDB Data Authority ---"

# Verify specific order
echo "Checking atlas_orders for $ORDER_ID..."
ORDER_ITEM=$(aws dynamodb get-item --table-name atlas_orders --key '{"order_id":{"S":"'$ORDER_ID'"}}' --region us-east-1 --output json)
if [[ -z "$ORDER_ITEM" || "$ORDER_ITEM" == "{}" ]]; then
    echo "❌ FAIL: Order $ORDER_ID NOT found in atlas_orders."
    exit 1
fi
echo "✅ Order $ORDER_ID found in DynamoDB."

# Verify specific balance
echo "Checking atlas_balances for $CLIENT_ID..."
BALANCE_ITEM=$(aws dynamodb get-item --table-name atlas_balances --key '{"account_id":{"S":"'$CLIENT_ID'"}}' --region us-east-1 --output json)
if [[ -z "$BALANCE_ITEM" || "$BALANCE_ITEM" == "{}" ]]; then
    echo "❌ FAIL: Balance for $CLIENT_ID NOT found in atlas_balances."
    exit 1
fi
echo "✅ Balance for $CLIENT_ID found in DynamoDB."

# 6. Verify S3 Objects
echo "--- Verifying S3 Audit Archive ---"
S3_OBJECTS=$(aws s3 ls s3://atlas-audit-demo/ --recursive | head -n 5)
if [ -n "$S3_OBJECTS" ]; then
    echo "✅ S3 Audit Bucket (s3://atlas-audit-demo) has objects."
else
    echo "❌ FAIL: s3://atlas-audit-demo is empty or unreachable."
    exit 1
fi

echo "🚀 ALL TESTS PASSED: ATLAS DynamoDB Persistence is AUTHORITATIVE."
exit 0
