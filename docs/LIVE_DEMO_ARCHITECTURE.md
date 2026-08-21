# Manufacture Flow Live and Demo Architecture

## Permanent invariant

Manufacture Flow uses one PostgreSQL server and two databases with no shared business records:

- `machine_overwatch` is the Live database.
- `machine_overwatch_demo` is the deterministic presentation sandbox.

Both backend processes execute the same Next.js route tree, repositories, services, domain models, `schema.ts`, migration SQL, and Drizzle metadata. `APP_RUNTIME` is resolved once during process startup in `backend/src/lib/runtime/config.ts`; individual routes never choose a database.

During development, Live uses backend `.next-live` and Demo uses `.next-demo`; this prevents Next's process lock and Turbopack cache from making one runtime replace the other. Production builds retain the standard `.next` directory.

| Runtime | Port | Database | Session cookie |
| --- | ---: | --- | --- |
| Live | 3001 | `machine_overwatch` | `manufacture_flow_live_session` |
| Demo | 3002 | `machine_overwatch_demo` | `manufacture_flow_demo_session` |
| Frontend | 3000 | active runtime API | runtime-namespaced browser state |

Cookies need different names because browser cookies are scoped by hostname, not TCP port. RBAC remains authoritative in both runtimes. Demo Mode establishes the seeded Demo Plant Manager through the Demo-only session control route; it does not reuse or revoke the Live session.

## Configuration and refusal rules

```text
APP_RUNTIME=live|demo
LIVE_DATABASE_URL=postgresql://.../machine_overwatch
DEMO_DATABASE_URL=postgresql://.../machine_overwatch_demo
DATABASE_URL=<optional backwards-compatible Live URL only>
```

Startup refuses invalid modes, equal Live/Demo URLs, or a mismatched explicit Live `DATABASE_URL`. Demo always resolves from `DEMO_DATABASE_URL` and never inherits the legacy Live `DATABASE_URL`. Destructive Demo operations prove the URL-level invariant and query `current_database()` immediately before mutation. There is no force override.

## Database lifecycle

```powershell
npm.cmd run db:up
npm.cmd run db:create:demo
npm.cmd run db:migrate:all
npm.cmd run db:seed
npm.cmd --prefix backend run db:seed:demo
npm.cmd run db:parity
npm.cmd run validate:health:live
npm.cmd run validate:health:demo
```

`run-project.bat` waits for the Compose health check rather than a fixed delay. Demo creation verifies host, port, owner, and distinct database names under a PostgreSQL advisory lock. Live seeding is repeat-safe; rows without natural database uniqueness constraints are checked explicitly before insertion.

Future schema changes follow one lineage:

1. Change `backend/src/lib/db/schema.ts` once.
2. Generate one migration with `npm.cmd run db:generate`.
3. Review the SQL and Drizzle snapshot.
4. Validate on an isolated temporary database.
5. Apply the same migration folder to Demo and verify.
6. Apply the same migration folder to Live and verify.
7. Run `npm.cmd run db:parity`.

Never generate a Demo-specific migration, snapshot, journal, schema, route, or service.

## Demo control boundary

The shared backend includes three Demo-only control APIs. Each refuses execution in Live:

- `POST /api/demo-control/reset` truncates only explicit Demo business tables, preserves schema/migrations, and seeds a healthy deterministic scenario.
- `POST /api/demo-control/session` establishes the seeded Demo Plant Manager session.
- `POST /api/demo-control/trigger-telemetry` sends deterministic healthy, warning, and critical observations through the accepted telemetry service and recovery graph.

After critical telemetry, normal services persist prediction, alerting, allocation lock, inventory decision, optional procurement, maintenance work order, recovery estimate, production rerouting, delivery impact, and stakeholder notification. Story Mode never inserts final success states.

Supported scenarios:

- `golden`: no local bearing; procurement; intentional validation failure; rework; pass; recovered.
- `local-spare`: reservable bearing; no procurement request; maintenance and recovery.
- `failure-rework`: focused fail, retained lock, corrective rework, retest, and recovery.

Reset occurs before start, from Reset Demo, and on Demo exit. Exit switches to Live and refetches Live rather than restoring an old cache snapshot.

## Frontend and realtime

`frontend/src/lib/api-client.ts` is the only API-base resolver. `OperationsContext` owns runtime selection, namespaced browser state, authenticated read models, command refresh, and Demo transitions. Screens discover the current failure case from `/api/operations/overview`.

`GET /api/events` streams persisted workflow events with credentials, heartbeat comments, chronological cursors, reconnect support, and active-runtime-only connections. Events and successful commands refetch overview plus active case.

API failures show a global error and Retry. Failed business reads are not silently replaced with fixture success. Live shipment geography stays explicitly unavailable until a real route source supplies coordinates; controlled Demo geography is labelled.

## Story Mode

The dashboard launcher selects Manual or Auto and a scenario. Both share `frontend/src/components/story/scenario.ts` and semantic `data-tour-id` targets. Auto uses an in-app cursor, navigates existing pages, clicks real controls, and polls persisted evidence. A failed target, request, or evidence wait pauses and exposes reset/exit controls.

Maintenance PASS uses `POST /api/failure-cases/[caseId]/actions`; it completes the work order, releases the lock, restores `OPERATIONAL`, resolves the failure, and records `RECOVERED`. FAIL leaves the lock active and records intervention/rework state.

## Safety validation

```powershell
npm.cmd run db:parity
npm.cmd run validate:demo-isolation
npm.cmd run validate:seed-idempotency
npm.cmd run validate:health:live
npm.cmd run validate:health:demo
```

Parity compares semantic tables, columns, constraints, indexes, enums, and the complete migration timeline. Migration hashes accept only LF/CRLF encodings of the checked-in SQL; actual SQL changes still fail. The isolation validator fingerprints complete row contents across every Live table, runs the full Demo graph, fingerprints Live again, and fails loudly if any Live table changes.
