# Backend status

## Implemented

- PostgreSQL + Drizzle migrations and repeatable WS-102 seed data.
- Authenticated local sessions with HTTP-only cookies, password verification, and server-side role checks.
- Guarded workflow commands for inventory reservation, reroute approval, maintenance stages, procurement state/notes, shipment state, and notification acknowledgement/retry.
- Atomic inventory availability guard, workflow conflict responses, and append-only workflow events.
- Read APIs for health, operations overview, complete failure case, and immutable audit history.
- Notification delivery-attempt history: retries and acknowledgements append attempts instead of replacing history.
- Per-user reduced-motion preference API and frontend persistence.
- Production build configuration and Docker deployment definitions.

## Still required before a real production deployment

- Replace local demo users/passwords with approved SSO/identity management and password reset policy.
- Managed PostgreSQL backups, secret manager, TLS/reverse proxy, logging/monitoring, rate limits, and alerting.
- Telemetry Monitor Agent is implemented as a controlled deterministic ingestion and anomaly-classification slice. It persists readings, prevents duplicate source events, and records agent/audit output; it does not yet create failure cases or invoke a real ML model.
- Real telemetry provider, ML prediction, ERP/inventory, scheduling, vendor, carrier, and weather providers; current content remains controlled scenario data.
- Explicit idempotency keys for externally retried client requests, plus wider approval/execution workflow modeling.
- Browser E2E execution after Playwright Chromium can download; it is currently environment-blocked.
- Integrate and validate the user-supplied robot-arm and conveyor/belt 3D assets.
