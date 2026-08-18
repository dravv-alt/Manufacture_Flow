# Machine Overwatch frontend audit and merged implementation guide

Audit date: 16-Aug-2026

## 1. Executive verdict

The frontend is now a strong, coherent controlled-demo product, but it is **not yet production-stable, release-optimal, or deploy-only ready**.

- Both applications expose the same 21 audited routes and every route returned HTTP 200 in the running browser check.
- Both production source trees compile with zero application-source TypeScript diagnostics when test/config files are excluded.
- The official `typecheck`, `test`, and `build` gates do not pass because `vitest` and `@playwright/test` are referenced but not installed.
- The duplicate is the stronger visual candidate, while the original retains several clearer and more honest operational surfaces. The folders must be merged selectively, not copied over one another.
- The current state is suitable for a controlled stakeholder demo after a short P0 hardening pass. It is not suitable for production authentication, live telemetry, autonomous workflow execution, or external communication.

**Backend/DB decision:** start backend and database work now, but begin with API contracts, event/state definitions, and one WS-102 vertical slice. In parallel, freeze and harden the canonical frontend. Do not build the complete backend against the current ad-hoc `Partial<OperationsState>` patch model.

## 2. Canonical-folder decision

Use `frontend_next_duplicate` as the **candidate canonical visual implementation** because it contains the richer dashboard, maintenance command surface, procurement conversation, shipment route/weather view, circuit board, and recovery tabs.

Keep `Manufacturing_Workflow_Project/frontend_next` as the **behavior and semantic reference** until the selective merge is complete. In particular, preserve from the original:

- the dashboard's explicit advisory wording;
- its compact, data-dense plant summary and workstation table;
- the simpler maintenance scenario calculation and assumptions;
- the explicit shipment comparison and notification-state matrix;
- any action that is clearer or more honest than its duplicate equivalent.

Do not replace either folder wholesale. The current worktrees contain substantial uncommitted user work.

## 3. Audit scope and evidence

The audit covered:

- `ps.md`, the master interactive plan, frontend execution plan, checklist, process flow, and reusable-component mapping;
- complete route and source inventories for both applications;
- direct hash comparison of the two source trees;
- demo-data marker validation;
- TypeScript, unit-test, build, and route-health checks;
- desktop browser captures of Dashboard, Failure, Re-routing, Warehouse, Procurement, Maintenance, and Shipment;
- mobile captures at 390 x 844 for Dashboard and Shipment;
- provider/state boundaries, route protection, consequential actions, loading/error states, test coverage, 3D assets, accessibility, responsiveness, and production integration readiness.

No application source file was changed by this audit. This guide is the only added file.

## 4. Validation results

| Check | Original | Duplicate | Result |
|---|---:|---:|---|
| Audited routes return HTTP 200 | 21/21 | 21/21 | Pass |
| `npm run check:demo-data` | Pass | Pass | Pass |
| Application-source TypeScript diagnostics | 0 | 0 | Pass with tests/config excluded |
| `npm run typecheck` | Fails | Fails | Missing `vitest` and `@playwright/test` types |
| `npm run test` | Fails | Fails | `vitest` command is unavailable |
| `npm run build` | Compiles app, then fails type checking | Compiles app, then fails type checking | Not a release pass |
| Existing E2E expectations | Stale | Stale | Dashboard/offline assertions do not match current headings |
| Browser desktop smoke | Major routes render | Major routes render | Pass with issues below |
| Browser mobile smoke | Not fully repeated | Dashboard/Shipment captured | Horizontal clipping/overflow confirmed |

Additional build note: Next.js warns that a user-level `C:\Users\bhavv\package-lock.json` is being ignored outside the repository. Set an explicit `turbopack.root` or remove the ambiguous workspace-root detection before release.

## 5. How far the project has come against `ps.md`

The original problem statement describes prediction, causal diagnosis, allocation blocking, inventory/procurement, maintenance, re-routing, shipment impact, and stakeholder notification. The frontend now represents nearly the whole story, but most capabilities remain controlled local simulations.

| BRD requirement | Frontend evidence | Production status |
|---|---|---|
| FR-1 Predictive failure detection | Dashboard, failure list/detail, risk and TTF | UI fixture only; no telemetry or model service |
| FR-2 Faulty-part identification | WS-102 bearing and BRG-10023 are traceable | Demo identity; no asset/BOM master integration |
| FR-3 Inventory verification | Warehouse available/unavailable and reservation paths | Session-state simulation; no stock ledger or transaction |
| FR-4 Procurement automation | Draft, vendor thread, lead/transit projection | No requisition API, approval engine, vendor email, or acknowledgement |
| FR-5 Production re-routing | Affected jobs, target choice, capacity/load views | No scheduling solver, constraint validation, dispatch, or durable approval |
| FR-6 Maintenance scheduling | Work order, assignee, seven recovery stages, ETA | No work-order service, permissions, evidence, or audit trail |
| FR-7 Delivery impact | Comparison, route/weather context, revised commitment | Controlled schematic only; no carrier GPS/weather/ERP shipment data |
| FR-8 Recovery time calculation | Local-spare and vendor-replenishment scenarios | Deterministic fixture calculation; needs server-owned rules and tests |
| FR-9 Stakeholder notification | Delivery center and shipment notification controls | Local component state; no channel delivery, retry queue, receipt, or persistence |
| FR-10 Digital twin/dashboard | Plant dashboard, twin routes, GLTF scenes, exploded iframe | Visual foundation; DT-03 to DT-08 behavior is incomplete and not fully synchronized |

Audit estimate, not a contractual completion percentage:

- visual controlled-demo frontend: approximately 80%;
- coherent end-to-end simulated workflow: approximately 65%;
- production-ready frontend: approximately 50%;
- backend/DB/live integration: approximately 5-10%;
- complete deployable product against the original problem statement: approximately 35-45%.

The checklist's current raw state is 87 checked and 354 open out of 441 items. It is stale in both directions: some open items already exist in code, while some checked-looking surfaces are only presentational. Reconcile it after the canonical merge instead of using the raw count as the release percentage.

## 6. Page-by-page merged decision

### Public/authentication pages

Locations: `src/app/page.tsx`, `src/components/PublicLanding.tsx`, `src/components/AuthScreen.tsx`, `src/components/OnboardingFlow.tsx`.

Keep the controlled-demo disclosure and public route set. Before production, replace redirect-only sign-in with real identity, sessions, authorization, password/SSO handling, and protected server routes. The current sign-in accepts any valid-looking email and does not validate the password.

### Dashboard

Locations: `src/app/dashboard/page.tsx`, `src/components/PlantOverviewDashboard.tsx`.

Use the duplicate's eventful visual composition, calendar controls, OEE target interaction, telemetry drawer, and export behavior. Merge back the original's explicit advisory copy, operational station summary, clearer health table semantics, and `Open digital twin` affordance.

Fix before freeze:

- remove or implement `Add Sensor`, `Filter`, and `Export CSV`;
- rename `Halt` if it only opens inspection details;
- remove “live telemetry” claims until a live connector exists;
- centralize OEE 87.5, energy 450/88%, anomaly count, cycle/output, firmware, and other inline values in the provider;
- correct risk colors: WS-108 at 68% warning must not appear equivalent to WS-102 at 92% critical;
- remove the fabricated `atRiskStations.length + 12` anomaly total;
- preserve calendar month/year selection and keyboard access.

### Digital twin

Locations: `src/app/twin/page.tsx`, `src/app/digital-twin/[id]/page.tsx`, `src/components/TwinWorkspace.tsx`, `src/components/DigitalTwinScene.tsx`, `src/components/CncExplodedInspector.tsx`, `src/components/CncExplodedScene.tsx`.

Keep the current dynamic loading boundary and model assets, but do not declare DT-03 to DT-08 complete. `sceneMode` is accepted without changing scene geometry, the exploded iframe is not synchronized with React selection/progress, and the selection callback contract is incomplete.

Fix all-model preloading: four GLTF models and roughly 100.6 MiB of public assets are candidates for unnecessary transfer. The largest WS-108 normal texture alone is roughly 27.9 MiB. Load only the selected workstation, implement meaningful low-quality/LOD behavior, add a compact mobile fallback, and define a measured asset/performance budget.

### Failure control

Locations: `src/app/failure/page.tsx`, `src/app/failure/[id]/page.tsx`, `src/components/FailureViews.tsx`, `src/components/CircuitBoard.tsx`.

Keep the duplicate's circuit/downstream-impact enrichment and the searchable case list. Expand the detail workflow from the current shortened escalation view to an explicit traceable chain matching the BRD: detect, alert, block, diagnose, inventory, procurement branch, work order, re-route, recovery estimate, shipment/notifications.

Do not let `Initiate Reroute` silently become approval. Separate recommendation, review, approval, execution, rejection, stale-data, and blocked states.

### Re-routing

Location: `src/components/ReroutingControl.tsx`.

Keep the duplicate layout and capacity visualization. Rename `Execute All Reroutes` to `Review/Approve proposed plan` until dispatch exists. `3 JOBS PENDING` and `0 SLA Breaches` must derive from state. Confirmation must validate capacity, tooling, skills, priority, locks, and actor permissions. Execution requires an auditable backend transaction and idempotency key.

### Warehouse

Location: `src/components/WarehouseControl.tsx`.

Keep the duplicate's stock-command and physical-handoff views. The current available/unavailable branch is useful. Production requires SKU/location inventory, reservation ownership, expiry, concurrency control, movements, transfer ETA, and atomic reservation. Correct remaining `FC-2024-*`/`WO-2024-*` identifiers to the canonical 2026 scenario.

### Procurement

Location: `src/components/ProcurementControl.tsx`.

Keep the duplicate visual layout and append-only vendor/internal-note thread. Preserve the explicit disclaimer that no purchase authorization or external message is issued. Normalize the message styles into one thread system, retain scroll and history, and replace local notes with server-persisted events. Separate internal notes from vendor messages and require a clear send confirmation, recipient list, delivery status, and retry state.

### Maintenance

Location: `src/components/MaintenanceControl.tsx`.

Keep the duplicate command surface, uptime strip, lifecycle, and recovery metrics. Merge the original's concise work-order details and visible scenario assumptions. Replace `LIVE RECOVERY COMMAND` with `CONTROLLED RECOVERY COMMAND` until real events exist. A stage transition must require actor, timestamp, evidence/comment where applicable, valid previous state, and audit event; it cannot remain an arbitrary client-side index change.

### Shipment

Location: `src/components/ShipmentControl.tsx`.

Keep the duplicate's delivery command signal, route schematic, weather window, and clear “not live GPS/weather” disclosure. Merge the original's side-by-side original/revised commitment and complete notification-state matrix. The map/weather view is context, not carrier truth. Production needs shipment commitments, route legs, provider timestamps, weather source attribution, recipient delivery events, and failed-channel retry handling.

### Notifications

Location: `src/components/NotificationsControl.tsx`.

The current filter, acknowledge, and retry controls are local `useState` and are disconnected from shipment/procurement events. Move them into the shared workflow event model first, then backend persistence. Acknowledgement must record actor/time; retry must create a new delivery attempt without overwriting history.

### Settings and permissions

Locations: `src/components/SettingsControl.tsx`, `src/components/AppShell.tsx`.

Keep reduced-motion and decision-boundary disclosures. Remove the ability to visually turn demo mode off when no API provider exists. Persist actual preferences. Current role restrictions are navigation-only client checks; add server-side route/action authorization. Plant Manager's blanket access should be an explicit permission policy, not a hardcoded exception.

### Global navigation

Locations: `src/components/AppShell.tsx`, `src/components/WorkflowTabs.tsx`, `src/app/globals.css`.

The floating sidebar remains primary product navigation. The recovery ribbon should be contextual and appear only inside the WS-102 recovery journey. It currently appears on unrelated private pages and omits Warehouse and Procurement even though both are causal steps.

The desktop sidebar expands by animating width only on `:hover`. Add `:focus-within`, Escape/click-away behavior where applicable, stable overlay positioning that does not shift content, label delay/opacity, and motion reduction. The mobile workflow ribbon and page content currently overflow horizontally at 390 px; fix wrapping/scroll affordance and all min-width assumptions.

## 7. Cross-cutting release blockers

### P0 - must be fixed before calling the frontend stable

1. Install and pin the missing test tools; make `npm run check` pass in a clean install.
2. Repair the stale E2E assertions and cover the complete WS-102 local-spare and unavailable-stock branches.
3. Resolve mobile horizontal clipping on the workflow ribbon, shipment hero/cards, and other enriched pages.
4. Remove fake-live wording and make every consequential button truthful and functional, or visibly disabled with an explanation.
5. Consolidate all controlled data into one validated provider; eliminate inline fabricated metrics and 2024/2026 ID drift.
6. Replace arbitrary partial-state patches with explicit workflow commands and transition guards.
7. Make notifications and settings persistent and connected to the same scenario event history.
8. Implement real route/action authorization boundaries before production identity is introduced.
9. Complete or explicitly scope out DT-03 to DT-08; stop preloading every 3D model.
10. Run keyboard, screen-reader, reduced-motion, zoom, contrast, and 375/768/1024/1440 viewport acceptance tests.

### P1 - optimization and coherence

1. Restrict the recovery ribbon to contextual routes and include the full causal sequence.
2. Replace widespread raw hex styling with semantic status/design tokens.
3. Remove unused legacy/redundant components after confirming no imports.
4. Scope broad selectors such as `[role="log"]` to the intended component.
5. Consolidate Lucide/Material Symbols and avoid an unnecessary remote icon stylesheet.
6. Add route-specific skeletons, errors, empty states, stale data, permission denial, and retry behavior.
7. Measure bundle, LCP, INP, CLS, memory, and 3D performance instead of relying on compilation alone.
8. Add linting and an accessibility test gate.

## 8. Selective merge sequence

1. Freeze new visual work and snapshot both dirty worktrees.
2. Declare `frontend_next_duplicate` the temporary integration target; do not delete the original.
3. Create a file-level merge ledger for the 11 changed duplicate files plus `CircuitBoard.tsx` and `WorkflowTabs.tsx`.
4. For each changed page, preserve the duplicate visual layer and explicitly port the original semantic/data/action elements listed in section 6.
5. Normalize scenario IDs, dates, roles, status language, and demo/live disclosure.
6. Introduce explicit commands/events, then migrate page actions away from generic context patches.
7. Fix mobile and keyboard navigation before adding further cards or visuals.
8. Restore clean test/build gates and capture approved desktop/mobile baselines.
9. Remove dead components and build artifacts only after import and visual verification.
10. Rename/move the canonical folder only after all gates pass and the user approves the screenshots.

## 9. Backend and database implementation guide

### Start now: contract-first WS-102 vertical slice

Preserve `demoOperationsDataProvider` and add an `ApiOperationsDataProvider` behind the same view-model boundary. The UI must be able to switch providers without page rewrites, and must always display whether data is demo, cached, stale, or live.

Recommended first vertical slice:

1. read plant/workstation overview;
2. open WS-102 and its active bearing failure case;
3. list affected jobs and generate a proposed re-route;
4. check and reserve BRG-10023 atomically;
5. create/update the linked maintenance work order;
6. calculate recovery and shipment impact;
7. append notification/audit events;
8. stream status updates to the frontend with SSE initially; use WebSockets only if bidirectional real-time behavior is proven necessary.

### Core relational model

Use PostgreSQL for transactional workflow data. Add TimescaleDB or a dedicated telemetry store only for high-volume time-series telemetry after retention/query requirements are measured.

Minimum entities:

- organizations, plants, production lines, workstations;
- components, parts, BOM/asset-component links;
- telemetry readings and telemetry source health;
- failure cases, evidence, predictions, affected jobs;
- workstation capabilities, tooling, skills, calendars and capacity;
- reroute plans, assignments, constraint results, approvals and executions;
- inventory items, locations, balances, reservations, transfers and movements;
- vendors, procurement requests, approvals, vendor messages and delivery events;
- maintenance work orders, tasks, stages, assignees, evidence and completion checks;
- recovery estimates and named assumptions;
- shipment commitments, revisions, route legs and impact assessments;
- notifications, recipients, attempts, receipts and acknowledgements;
- users, roles, permissions and immutable audit events.

Do not store the frontend's entire flat state object as one JSON record. Use relational state plus an append-only event/audit history. JSONB is appropriate for versioned evidence or provider payloads, not as a replacement for core constraints.

### Initial API surface

- `GET /api/plants/{plantId}/overview`
- `GET /api/workstations/{workstationId}`
- `GET /api/workstations/{workstationId}/telemetry`
- `GET /api/failure-cases` and `GET /api/failure-cases/{caseId}`
- `POST /api/failure-cases/{caseId}/acknowledgements`
- `POST /api/failure-cases/{caseId}/reroute-plans`
- `POST /api/reroute-plans/{planId}/approve`
- `POST /api/reroute-plans/{planId}/execute`
- `GET /api/parts/{partId}/availability`
- `POST /api/inventory/reservations`
- `POST /api/procurement-requests` and vendor-message endpoints
- `POST /api/maintenance/work-orders` and guarded stage-transition endpoints
- `POST /api/recovery-estimates`
- `POST /api/shipment-impact-assessments`
- `POST /api/notifications/{notificationId}/attempts`
- `POST /api/notifications/{notificationId}/acknowledgements`
- `GET /api/audit-events?entityType=...&entityId=...`

Every consequential mutation needs authentication, authorization, validation, actor/time metadata, idempotency, optimistic-concurrency protection, and a durable audit event. Inventory reservation and route execution need database transactions.

### Backend start gate

Backend schema and contract work can begin immediately. Full endpoint implementation should begin only after these frontend contracts are frozen:

- canonical IDs and timestamps;
- status/transition enums;
- proposal versus approval versus execution semantics;
- API error/stale/permission states;
- exact dashboard and detail view models;
- notification and audit event shapes.

## 10. Definition of frontend-stable

The frontend is stable and optimal enough to hand to backend integration only when all of the following are true:

- one canonical app/folder is declared and the merge ledger is closed;
- a clean install passes demo-data check, lint, typecheck, unit tests, build, and E2E;
- both WS-102 recovery branches pass end-to-end without state replacement or history loss;
- all 21 routes have loading/error/empty/permission behavior;
- no dead or misleading control remains;
- no controlled data is labelled live;
- keyboard and responsive acceptance passes at 375, 768, 1024, and 1440 px;
- the sidebar works on hover, focus, keyboard, touch, collapse, and reduced motion;
- route and action authorization is enforced outside the client UI;
- 3D assets meet a measured loading/memory budget and have a mobile fallback;
- API/demo provider switching is proven without page rewrites;
- approved visual baselines exist for every operational route.

## 11. Immediate next work package

Do these together as one bounded stabilization package before further visual expansion:

1. canonical merge ledger and scenario normalization;
2. dependency/test-gate repair;
3. mobile overflow and navigation accessibility;
4. truthful control/copy pass;
5. explicit workflow command/event model;
6. provider/API contract definitions;
7. critical-path E2E and screenshot baselines.

After that package passes, start the first real backend/DB vertical slice while preserving the demo provider for deterministic demos and tests.
