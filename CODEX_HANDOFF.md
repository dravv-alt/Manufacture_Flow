# Codex handoff

## Scope and Git

- Project: `frontend_next_duplicate` (Machine Overwatch); branch: `Updated`.
- Latest accepted commit: `888afb6 feat: add production rerouting agent`.
- Recent accepted feature commits: `5553d81` recovery-time estimation, `6309396` maintenance work order, `a2dc15d` procurement automation, `0ac99ad` inventory recovery, `542f26c` allocation lock, `d191e30` LangGraph runtime, `0daf5c9` alerting, `c3e9c80` prediction, `83ef0f7` telemetry.
- No push. Never amend/squash accepted commits. One validated local commit per component.
- Do not touch/stage/commit: `run-project.bat`, `backend/node_modules/`, `frontend/AGENTS.md`, `frontend/CLAUDE.md`, `frontend/test-results/`.

### Current Git evidence

```text
git status --short
 M run-project.bat
?? backend/node_modules/
?? frontend/AGENTS.md
?? frontend/CLAUDE.md
?? frontend/test-results/

git log --oneline -12
888afb6 feat: add production rerouting agent
5553d81 feat: add recovery time estimation agent
6309396 feat: add maintenance work order agent
a2dc15d feat: add procurement automation agent
0ac99ad feat: add resource recovery inventory agent
542f26c feat: add recovery allocation lock orchestrator
d191e30 feat: add langgraph recovery agent runtime
0daf5c9 feat: add failure prediction alerting agent
c3e9c80 feat: add failure prediction agent
83ef0f7 feat: add telemetry monitor agent
f5dab94 chore: add production deployment handoff
1469e9c feat: add audit history and persisted delivery records
```

## Implemented flow and persistence

```text
Telemetry -> Failure Prediction -> Alerting -> Allocation Lock -> Inventory
-> Procurement if required -> Maintenance WO -> Recovery Time -> Rerouting -> END
```

- Durable domains: telemetry/predictions, alerts/attempts, agent runs/events, allocation locks/jobs, inventory recovery, procurement, maintenance work orders, recovery-time revisions, reroute capabilities/decisions/plans.
- Key tables: `recovery_graph_runs`, `agent_runs`, `workflow_events`, `production_jobs`, `workstation_allocation_locks`, `resource_recovery_results`, `procurement_automation_results`, `maintenance_work_orders`, `recovery_time_estimates`, `reroute_decisions`, `reroute_plans`.
- Recent migrations: `0011_crazy_sentinels.sql`, `0012_recovery_time_estimates.sql`, `0013_production_rerouting.sql`.

## Data and ML policy

- Mock data only via replaceable providers/repositories/adapters/seeds. Generic logic must not hardcode demo records. Real integrations replace these boundaries without redesigning LangGraph/workflow.
- `ControlledFailurePredictionProvider` remains active and visibly labelled. ML is deferred unless legitimate labelled data and time exist. Never fabricate ML accuracy, >85% accuracy, or ML TTF/RUL claims.

## Known issues

- Manual-server authenticated telemetry POST previously returned 401 with expected key; environment/auth smoke-test issue, close before final E2E.
- Playwright browser run previously blocked by Chromium environment/download.

## Exact next task: Delivery Impact Agent

Dependency chain: `Recovery-time estimate -> executed reroute decisions -> shipment commitments -> delivery impact`.

Consume estimate + executed reroutes under correlation ID; use persisted shipment/order commitments; persist original commitment, revised projection, delay, affected jobs, reason, correlation, classification `ON_TIME`/`AT_RISK`/`DELAYED`, agent run, workflow event; idempotent; next LangGraph node. Keep shipments behind a controlled repository/provider boundary. Do not add notifications, maintenance completion, return-to-service, frontend, ML, or external APIs.

`shipment_impacts` currently has only `externalId`, `failureCaseId`, `originalEta`, `revisedEta`, `deltaHours`, `state`; it lacks estimate/reroute linkage, classification, affected jobs, rationale/calculation inputs, correlation, and idempotency boundary. Use an additive migration.

Direct dependencies: `backend/src/lib/agent-graph/{graph,state}.ts`, `nodes/production-rerouting.ts`, `lib/production-rerouting/service.ts`, `lib/recovery-time-estimation/service.ts`, `lib/db/schema.ts`, `drizzle/meta/_journal.json`, `lib/operations/service.ts`.

Validation from `backend`:
```powershell
npm.cmd run typecheck
npm.cmd run test
npm.cmd run db:migrate
# Add/run real PostgreSQL validation: on-time, delayed, no-linked-shipment, duplicate trigger.
npm.cmd run build
```
