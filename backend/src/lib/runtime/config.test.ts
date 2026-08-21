import { describe, expect, it } from "vitest";
import { assertDemoDatabaseSafety, publicRuntimeInfo, resolveRuntimeConfiguration } from "./config";

describe("runtime safety", () => {
  it("keeps Live and Demo database identities isolated", () => {
    expect(publicRuntimeInfo()).toMatchObject({ mode: "live", isolated: true, demoEnabled: true });
  });

  it("refuses Demo control in the Live runtime", () => {
    expect(() => assertDemoDatabaseSafety()).toThrow(/disabled in the Live runtime/i);
  });

  it("never lets a legacy Live DATABASE_URL override Demo", () => {
    const configuration = resolveRuntimeConfiguration({
      APP_RUNTIME: "demo",
      DATABASE_URL: "postgresql://app:secret@127.0.0.1:5434/live",
      LIVE_DATABASE_URL: "postgresql://app:secret@127.0.0.1:5434/live",
      DEMO_DATABASE_URL: "postgresql://app:secret@127.0.0.1:5434/demo",
    });
    expect(configuration.activeDatabaseUrl).toBe("postgresql://app:secret@127.0.0.1:5434/demo");
  });

  it("refuses matching Live and Demo database URLs", () => {
    expect(() => resolveRuntimeConfiguration({
      APP_RUNTIME: "demo",
      LIVE_DATABASE_URL: "postgresql://app:secret@127.0.0.1:5434/shared",
      DEMO_DATABASE_URL: "postgresql://app:secret@127.0.0.1:5434/shared",
    })).toThrow(/must identify different databases/i);
  });

  it("refuses a mismatched explicit Live DATABASE_URL", () => {
    expect(() => resolveRuntimeConfiguration({
      APP_RUNTIME: "live",
      DATABASE_URL: "postgresql://app:secret@127.0.0.1:5434/wrong",
      LIVE_DATABASE_URL: "postgresql://app:secret@127.0.0.1:5434/live",
      DEMO_DATABASE_URL: "postgresql://app:secret@127.0.0.1:5434/demo",
    })).toThrow(/does not match the configured LIVE database/i);
  });
});
