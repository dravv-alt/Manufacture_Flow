import { z } from "zod";

export const telemetryIngestSchema = z.object({
  sourceEventId: z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9._:-]+$/, "sourceEventId may only contain letters, numbers, dots, underscores, colons, and hyphens."),
  workstationCode: z.string().trim().min(2).max(64),
  observedAt: z.coerce.date(),
  temperatureCelsius: z.number().finite().min(-50).max(250),
  vibrationMmPerSecond: z.number().finite().min(0).max(100),
  pressureBar: z.number().finite().min(0).max(1000),
  cycleCount: z.number().int().min(0).max(2_000_000_000),
  motorCurrentAmps: z.number().finite().min(0).max(10_000),
  activeErrorCodes: z.array(z.string().trim().min(1).max(64)).max(32).default([]),
});

export type TelemetryIngestInput = z.infer<typeof telemetryIngestSchema>;
