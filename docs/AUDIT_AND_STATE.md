# Audit and State in ATLAS

This document details how ATLAS manages operational state and immutable audit logs.

## 1. State vs. Events vs. Audit

- **State (DynamoDB)**: The current, live snapshot of the system. If you ask "How much USD does Account A have?", you look here.
- **Events (Kafka)**: The discrete messages that cause state changes. If you ask "How did Account A get $100?", you look here.
- **Audit (S3)**: The long-term, durable storage of all events. If a regulator asks for your 2024 trade logs, you look here.

## 2. Restart & Recovery Scenarios

### Service Crash
If `oms-core` or `order-gateway` crashes, no data is lost.
1. All balances and order statuses are stored in DynamoDB.
2. Unprocessed commands/events remain in Kafka.
3. Upon restart, services load their current context from DynamoDB and resume consuming from their last Kafka offset.

### Ledger Integrity
ATLAS uses **Conditional Writes** in DynamoDB. For example:
`UPDATE usd_available = usd_available - 5000 WHERE usd_available >= 5000`
This ensures that even if two instances of a service try to process the same account simultaneously, the balance can never go negative and funds are never "ghost-reserved".

## 3. Failure Handling

### Kafka Failure
If Kafka is unavailable, the Gateway will reject new orders at the front door to prevent state desync.

### DynamoDB Failure
DynamoDB operations are wrapped in retry logic. If the database is hard-down, services enter a "Stalled" state to prevent inconsistent event emission.

### S3 Failure
The `audit-exporter` only commits Kafka offsets *after* a successful S3 `PutObject`. If S3 is down, the exporter will pause, ensuring that every single event is eventually archived once S3 is back up.

## 4. Scalability Note
While this demo uses a single account ID, the DynamoDB schema is designed with `account_id` as the Partition Key (PK), allowing AWS to scale the data horizontally as more traders join the platform.
