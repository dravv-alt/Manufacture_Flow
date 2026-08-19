# Open validation issues

## VI-001 — authenticated telemetry API smoke test

**Status:** Open; non-blocking for component development, blocking for final E2E sign-off.

`POST /api/telemetry` correctly returns `401` from a manually started production-mode local server when no ingest key is available. During the Telemetry Monitor Agent slice, the temporary server harness did not receive the expected test key even when it was supplied by the parent command. The telemetry service, migration, unit tests, and production route build passed independently.

Do not redesign the telemetry route or authentication around this observation. Reproduce and close it as an environment/auth smoke-test issue before final Playwright E2E validation.
