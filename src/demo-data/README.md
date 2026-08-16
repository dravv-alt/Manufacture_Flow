# Demo data boundary

Every fixture, seeded scenario, and simulated value in this directory must begin with the exact comment:

// demo_data

This frontend currently presents a controlled demonstration. Do not describe these values as live plant telemetry.

`types.ts` defines the demo contract and `provider.ts` is the active controlled-scenario provider. When a real API is introduced, keep its adapter separate from these fixtures so the source of each value remains explicit.
