# ATLAS — Production-Grade Trading Platform Architecture

ATLAS is a **high-performance, event-driven trading platform** built to demonstrate how modern electronic trading systems are designed for **low latency, fault tolerance, scalability, and regulatory-grade auditability**.

It is not a toy UI or CRUD app — ATLAS models real exchange architecture patterns used in professional trading systems (OMS, gateways, event streams, idempotency, and audit trails), while remaining safe to run as a **browser-based demo**.

---

## ✨ What This Project Demonstrates

- Real-time, event-driven trading workflows
- Separation of execution, state, and audit concerns
- Kafka-style streaming architecture
- Idempotent order handling and recovery
- Stateless services with authoritative persistence
- Production-style observability and safety controls
- A polished trading console UI for demos & walkthroughs

> ⚠️ **Important**  
> ATLAS is an **engineering demonstration**.  
> It does **not** connect to real markets, custodians, or user funds.

---

## 🏗️ High-Level Architecture

ATLAS follows a **three-path architecture** inspired by real trading platforms:

### 1️⃣ Hot Path — Real-Time Execution  
Handles low-latency order flow and market events.

- Order Gateway → OMS → Venue Simulator
- Events flow through a Kafka-compatible stream (Redpanda)
- Optimized for throughput and ordering, not durability

### 2️⃣ State Path — Authoritative Persistence  
Maintains the current truth of the system.

- Orders and balances stored in DynamoDB (cloud mode)
- Enables stateless services and restart safety
- Uses conditional writes and idempotency guards

### 3️⃣ Cold Path — Immutable Audit  
Captures every event for compliance and analytics.

- Kafka events exported to S3 as immutable JSONL
- Designed for regulatory audit & data lake ingestion

---

## 🧠 Why Redpanda (Kafka-Compatible)?

ATLAS uses **Redpanda**, a Kafka-compatible streaming platform, for the following reasons:

- Kafka protocol compatibility (same APIs, same concepts)
- Single binary, no JVM or Zookeeper
- Much simpler local development & demos
- Production-grade performance characteristics

> In real deployments, Redpanda can be replaced with Apache Kafka or MSK with no architectural changes.

---

## 🖥️ Trading Console (Frontend)

The ATLAS Console is a **Next.js + React** application designed to resemble professional trading terminals.

### Features:
- Live order entry and execution feedback
- Real-time market data simulation
- Risk preview and exposure calculations
- Trader Control Center (volatility, liquidity, spread)
- Live orders table with dynamic layout
- Analytics & insight panels
- Demo-mode safe (no backend required for UI demo)

The UI automatically adapts:
- If there are **no live orders**, analytics move up (no empty space)
- If orders increase, the table grows or scrolls naturally

---

## 🛠️ Tech Stack

### Backend
- Go (microservices)
- Event-driven architecture
- Kafka-style messaging (Redpanda)

### Frontend
- React + TypeScript
- Next.js
- Tailwind CSS
- Vite

### Infrastructure
- Docker & Docker Compose
- Terraform (AWS resources)
- AWS DynamoDB (state)
- AWS S3 (audit)

### Observability
- OpenTelemetry
- Prometheus
- Grafana

---



## 📂 Repository Structure

```text
.
├── apps/
│   └── atlas-console/       # Trading UI (Next.js)
├── services/
│   ├── order-gateway/       # API entry & idempotency
│   ├── oms-core/            # Order lifecycle & state
│   ├── venue-sim/           # Market / exchange simulator
│   └── audit-exporter/      # Kafka → S3 audit pipeline
├── infra/
│   ├── docker-compose/      # Local orchestration
│   └── terraform/           # AWS infrastructure
├── scripts/
│   └── aws_verify.sh        # Cloud verification helpers
└── README.md

