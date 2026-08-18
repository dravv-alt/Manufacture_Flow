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

## Reset a local demo database

```powershell
npm run db:reset
npm run db:migrate
npm run db:seed
```

`db:reset` removes only the `machine_overwatch_postgres` Docker volume created by this project. It should never be used against a production database.
