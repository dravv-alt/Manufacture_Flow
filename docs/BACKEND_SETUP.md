# Machine Overwatch backend: local setup

The first working backend slice is intentionally local and desktop-demo friendly. It uses PostgreSQL through Docker and Drizzle migrations. The frontend remains in controlled demo mode unless `NEXT_PUBLIC_DATA_SOURCE` is switched in a later integration pass.

## Start locally

```powershell
npm run db:up
npm run db:migrate
npm run db:seed
npm run dev
```

Database endpoint: `postgresql://machine_overwatch:machine_overwatch@127.0.0.1:5434/machine_overwatch`

Copy `.env.example` to `.env.local` only when changing the defaults. Never commit real production credentials.

## Local controlled accounts

Run `npm run db:seed` once, then use any of these accounts at `/sign-in`. All local accounts use the password `MachineOverwatch!2026`; these credentials exist only for the Docker-backed controlled scenario and must be replaced before deployment.

| Role | Email | Can approve |
|---|---|---|
| Plant Manager | `manager@northfab.local` | All workflow commands |
| Maintenance Lead | `maintenance@northfab.local` | Maintenance transitions and notifications |
| Procurement Team | `procurement@northfab.local` | Procurement states and internal notes |
| Logistics Team | `logistics@northfab.local` | Shipment states and notification retry |

## Implemented API slice

| Endpoint | Purpose |
|---|---|
| `GET /api/health` | Checks PostgreSQL connectivity. |
| `GET /api/operations/overview` | Returns persisted plant, station, failure, inventory, reroute, maintenance, and shipment summaries. |
| `POST /api/telemetry` | Records one controlled machine telemetry observation, runs deterministic anomaly classification, and is idempotent by `sourceEventId`. Production calls require `x-telemetry-api-key`. |
| `GET /api/telemetry?workstationCode=WS-105&limit=50` | Returns the latest persisted telemetry observations for one workstation. |
| `POST /api/telemetry/{sourceEventId}/predictions` | Runs the controlled Failure Prediction Agent for one persisted telemetry observation. Plant Manager and Production Supervisor only. |
| `POST /api/failure-predictions/{predictionId}/alerts` | Creates the idempotent, recipient-specific Failure-Prediction Alerting Agent notifications. Plant Manager and Production Supervisor only. |
| `GET /api/failure-cases/FC-2026-0047` | Returns the complete WS-102 recovery context and audit timeline. |
| `POST /api/failure-cases/FC-2026-0047/actions` | Executes guarded reserve, reroute approval, maintenance-stage, and notification acknowledgement commands. |
| `POST /api/auth/login` | Starts an HTTP-only local session after a password check. |
| `GET /api/auth/session` | Returns the current signed-in local user, if any. |
| `POST /api/auth/logout` | Revokes the current local session. |

### Example commands

```json
{ "type": "reserve_part", "actor": "Plant Manager", "quantity": 1 }
```

```json
{ "type": "approve_reroute", "actor": "Plant Manager" }
```

```json
{ "type": "advance_maintenance", "actor": "A. Kulkarni", "expectedStage": 3 }
```

```json
{ "type": "acknowledge_notification", "actor": "Maintenance Lead", "notificationId": "<UUID from case response>" }
```

The API records workflow events for every successful command. Inventory reservation uses a database condition so an insufficient concurrent reservation returns HTTP 409 instead of overselling stock. Maintenance transitions check the expected stage before advancing. Every action also requires an HTTP-only session; the server replaces client-supplied actor names with the authenticated display name and checks that role against the command permission matrix.

### Controlled telemetry ingestion

`TelemetryMonitorAgent` is the first automation slice. It classifies an incoming observation as `none`, `warning`, or `critical` from versioned controlled thresholds, persists the reading and an immutable agent-run record, and adds a case audit event when an existing case is linked to that workstation. It deliberately does **not** create a failure case or make a recovery decision; those remain future agent slices.

Use a stable gateway event ID for retries. The same `sourceEventId` returns the original result without a duplicate reading, agent run, or audit event. Set `TELEMETRY_INGEST_API_KEY` outside development and send it as `x-telemetry-api-key`.

### Controlled failure prediction

`FailurePredictionAgent` is the next isolated automation slice. It consumes one persisted telemetry observation and writes a durable component/part prediction, confidence, time-to-failure, provider version, rationale, agent run, and audit event. It links a matching existing failure case or creates a new `Prediction recorded / awaiting alerting` case. It does **not** alert stakeholders, block allocation, reserve parts, or reroute jobs.

The current provider is deterministic and explicitly labelled `ControlledFailurePredictionProvider / controlled-v1`; it is not a trained ML model. Its WS-102 critical mapping deliberately matches the canonical BRD scenario: `BRG-10023`, 92% probability, and an 18-hour estimate.

### Failure-prediction alerting

`FailurePredictionAlertingAgent` consumes one persisted failure prediction and creates exactly three in-app alerts: Production Supervisor, Maintenance Manager, and Plant Head. Each notification receives initial delivery state, a delivery-attempt history row, an agent-run record, and a workflow event. Repeating the same prediction ID returns the original three alerts without duplicates.

This slice intentionally does not create procurement, shipment, vendor, or customer notifications, and it does not execute allocation or maintenance actions.

## Reset a local demo database

```powershell
npm run db:reset
npm run db:migrate
npm run db:seed
```

`db:reset` removes only the `machine_overwatch_postgres` Docker volume created by this project. It should never be used against a production database.
