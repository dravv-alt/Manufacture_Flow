# Demo data boundary

Every fixture, seeded scenario, and simulated value in this directory must begin with the exact comment:

// demo_data

This frontend currently presents a controlled demonstration. Do not describe these values as live plant telemetry.

`types.ts` defines the demo contract. `OperationsContext` selects the active
`DemoOperationsProvider` unless `NEXT_PUBLIC_OPERATIONS_MODE=backend` is set.
The old snapshot-only provider is archived under `archive/legacy-ui` and must
not be imported. When a real API is introduced, keep its adapter separate from
these fixtures so the source of each value remains explicit.
