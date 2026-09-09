# ManufactureFlow (Machine Overwatch)

> **Predictive Workstation Failure Detection & Autonomous Production Re-Routing Engine**  
> An AI-driven self-healing manufacturing operations platform built with LangGraph, Next.js, PostgreSQL, and 3D Digital Twin technology.

---

## 🌟 Overview

In modern manufacturing plants, unexpected workstation breakdowns cause domino-effect delays across production lines, supply chains, and customer commitments. **ManufactureFlow** transforms traditional reactive repairs into an autonomous, proactive operational loop.

When telemetry anomalies indicate impending machine failure, ManufactureFlow's multi-agent graph predicts the failure, alerts supervisors, halts new job dispatch, verifies warehouse inventory, procures missing spare parts, schedules maintenance, estimates recovery timelines, reroutes active jobs to compatible machines, calculates delivery impacts on customer shipments, and keeps all stakeholders informed in real time.

---

## 🤖 Autonomous Multi-Agent Recovery Architecture (LangGraph)

The system is powered by an 11-node state graph compiled with `@langchain/langgraph` and durably persisted in PostgreSQL:

```
[START]
   │
   ▼
1. TelemetryMonitorAgent ──────────► Ingests & evaluates live sensor thresholds (temp, vibration, current, etc.)
   │
   ▼
2. FailurePredictionAgent ─────────► Identifies failing component, part code, failure risk %, and TTF
   │
   ├── [Anomaly Detected]
   │       │
   │       ▼
   │  3. FailurePredictionAlertingAgent ──► Emits immediate alerts to Supervisor, Maintenance, & Plant Head
   │       │
   │       ▼
   │  4. RecoveryOrchestratorAgent ───────► Enforces safety policy & locks workstation allocation
   │       │
   │       ▼
   │  5. ResourceRecoveryAgent ───────────► Checks plant inventory & executes automated reservations
   │       │
   │       ├───────────────────────────────┐
   │       ▼ [Part Missing]                ▼ [Part Available]
   │  6. ProcurementAutomationAgent        │
   │       (Ranks vendors, generates PR,   │
   │        notifies vendor & CCs teams)   │
   │       │                               │
   │       └───────────────┬───────────────┘
   │                       │
   │                       ▼
   │  7. MaintenanceWorkOrderAgent ───────► Generates critical work order, checklist, & repair windows
   │       │
   │       ▼
   │  8. RecoveryTimeEstimationAgent ─────► Calculates precise machine recovery ETA based on scenario
   │       │
   │       ▼
   │  9. ProductionReroutingAgent ────────► Ranks candidate workstations (skill, tooling, capacity) & reroutes jobs
   │       │
   │       ▼
   │  10. DeliveryImpactAgent ────────────► Re-evaluates customer shipment dates & flags delivery delays
   │       │
   │       ▼
   │  11. FinalStakeholderNotification ───► Dispatches targeted action plans to Schedulers & Logistics
   │       │
   ▼       ▼
 [END]   [END]
```

### Return-to-Service Execution
Following the autonomous recovery pipeline, maintenance teams use an interactive lifecycle state-machine:
`Start Maintenance` ➔ `Record Repair Completion` ➔ `Start Machine Testing` ➔ `Validate Return-to-Service`.  
Once validation passes, the allocation lock is released and the workstation returns to `OPERATIONAL`.

---

## 🏭 Operational Workspaces & Role Views

ManufactureFlow provides dedicated workspace interfaces aligned with plant roles:

| Workspace | Route | Supported Role | Key Capabilities |
| --- | --- | --- | --- |
| **Plant Overview Dashboard** | `/dashboard` | Plant Manager / Supervisor | Real-time plant telemetry, KPI status, workstation health grid, and executive summary. |
| **3D Digital Twin** | `/twin` | Plant Operations | Interactive Three.js 3D workstation simulation with live sensor overlays and heatmaps. |
| **Failure & Recovery** | `/failure` | Production Supervisor | Anomaly detection, root cause diagnosis, failure probability, and allocation lock controls. |
| **Warehouse & Inventory** | `/warehouse` | Warehouse Team | Spare parts stock on hand, bin locations, reservations, and shortages. |
| **Procurement Automation** | `/procurement` | Procurement Team | Automated purchase requisitions, multi-criteria vendor ranking (lead time, cost, reliability). |
| **Production Rerouting** | `/rerouting` | Production Scheduler | Dynamic job reallocation, machine load balancing, tooling & skill qualification checks. |
| **Maintenance Control** | `/maintenance` | Maintenance Lead | Digital work orders, torque/calibration checklists, repair stages, and return-to-service validation. |
| **Shipment & Logistics** | `/shipment` | Logistics / Customer Service | Delivery impact analysis, revised ETA forecasts, and customer commitment risk tracking. |
| **Notifications** | `/notifications` | All Stakeholders | Role-filtered alert inbox with action requests and delivery status updates. |

---

## 🎭 Interactive Story Mode

The platform features built-in guided scenario simulations demonstrating full system resilience:
- **Golden Path**: Workstation failure with warehouse stockout ➔ automated vendor procurement ➔ job rerouting ➔ delayed shipment notification.
- **Local Spare**: Workstation failure with local parts available ➔ instant reservation ➔ expedited repair ➔ minimal delivery impact.
- **Failure Rework**: Post-repair machine testing fails ➔ triggers safety rework intervention before clearing return-to-service.

---

## 📁 Repository Structure

This monorepo separates frontend user interfaces from backend orchestrations:

```
├── frontend/                     # Next.js 16 + React 19 Frontend Application
│   ├── src/
│   │   ├── app/                  # App Router pages (/dashboard, /twin, /failure, etc.)
│   │   ├── components/           # UI Components, Workspaces, 3D Digital Twin, Story Controller
│   │   ├── contexts/             # OperationsContext & application state management
│   │   ├── demo-data/            # Controlled demo baseline data
│   │   └── lib/                  # API client and runtime config
│   └── package.json
│
├── backend/                      # Next.js API & LangGraph Orchestration Backend
│   ├── src/
│   │   ├── app/api/              # REST & SSE endpoints (/api/telemetry, /api/recovery-graph, etc.)
│   │   ├── lib/
│   │   │   ├── agent-graph/      # LangGraph multi-agent state graph nodes & routing
│   │   │   ├── agents/           # Deterministic agent policy logic and unit tests
│   │   │   ├── db/               # Drizzle ORM client, schemas, and migrations
│   │   │   ├── demo/             # Scenario seeding and simulation runners
│   │   │   ├── maintenance-execution/ # Return-to-service workflow engine
│   │   │   └── telemetry/        # Telemetry ingestion, thresholding, and simulation
│   │   └── scripts/              # Database migration, parity, and validation scripts
│   └── package.json
│
├── docs/                         # Project Documentation
│   ├── PS.md                     # Business Requirement Document (BRD) & Problem Statement
│   ├── BACKEND_SETUP.md          # Backend configuration and local demo accounts
│   └── LIVE_DEMO_ARCHITECTURE.md # Persistence, session isolation, and realtime rules
│
├── docker-compose.yml            # PostgreSQL multi-database container config
├── package.json                  # Workspace orchestrator package.json
└── run-project.bat               # One-click launcher script
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js** 20+
- **Docker Desktop** (for PostgreSQL)

### 1. Launch with One-Click Script (Windows)
Double-click `run-project.bat` or run in PowerShell:
```powershell
./run-project.bat
```
This will:
1. Start PostgreSQL on port `5434`
2. Create and migrate both `Live` and `Demo` databases
3. Validate schema parity and seed baseline data
4. Launch the Frontend (`http://localhost:3000`), Live API (`http://localhost:3001`), and Demo API (`http://localhost:3002`)

### 2. Manual Commands

```powershell
# Start PostgreSQL container
npm run db:up

# Run migrations and setup demo database
npm run db:migrate:all
npm run db:parity
npm run db:seed

# Start applications
npm run dev:frontend   # Runs on http://localhost:3000
npm run dev:backend    # Runs on http://localhost:3001

# Run tests and type verification
npm run typecheck
npm run test
```

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS 4, Framer Motion, GSAP, Three.js, React Three Fiber, Lucide Icons, Radix UI
- **Backend & Agents**: LangGraph (`@langchain/langgraph`), Next.js Route Handlers, TypeScript
- **Database & ORM**: PostgreSQL 16, Drizzle ORM, Drizzle Kit
- **Testing & Verification**: Vitest, Playwright, TypeScript (`tsc --noEmit`)

---

## 📄 Documentation

- [Business Requirement Document (BRD)](docs/PS.md)
- [Backend Setup & Demo Accounts](docs/BACKEND_SETUP.md)
- [Live Demo & Architecture Guide](docs/LIVE_DEMO_ARCHITECTURE.md)
