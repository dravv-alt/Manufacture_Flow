export type RuntimeMode = "live" | "demo";

const DEFAULT_LIVE_DATABASE_URL = "postgresql://machine_overwatch:machine_overwatch@127.0.0.1:5434/machine_overwatch";
const DEFAULT_DEMO_DATABASE_URL = "postgresql://machine_overwatch:machine_overwatch@127.0.0.1:5434/machine_overwatch_demo";

function parseMode(value: string | undefined): RuntimeMode {
  const mode = value?.trim().toLowerCase() || "live";
  if (mode !== "live" && mode !== "demo") throw new Error(`APP_RUNTIME must be live or demo; received ${JSON.stringify(value)}.`);
  return mode;
}

function normalizeDatabaseUrl(value: string) {
  const url = new URL(value);
  url.hostname = url.hostname.toLowerCase();
  return url.toString().replace(/\/$/, "");
}

function databaseName(value: string) { return decodeURIComponent(new URL(value).pathname.replace(/^\//, "")); }

type RuntimeEnvironment = Readonly<Record<string, string | undefined>>;

export function resolveRuntimeConfiguration(environment: RuntimeEnvironment) {
  const runtimeMode = parseMode(environment.APP_RUNTIME);
  const liveDatabaseUrl = environment.LIVE_DATABASE_URL?.trim() || DEFAULT_LIVE_DATABASE_URL;
  const demoDatabaseUrl = environment.DEMO_DATABASE_URL?.trim() || DEFAULT_DEMO_DATABASE_URL;
  if (normalizeDatabaseUrl(liveDatabaseUrl) === normalizeDatabaseUrl(demoDatabaseUrl)) throw new Error("LIVE_DATABASE_URL and DEMO_DATABASE_URL must identify different databases.");

  const configuredRuntimeUrl = runtimeMode === "demo" ? demoDatabaseUrl : liveDatabaseUrl;
  // DATABASE_URL remains a backwards-compatible Live alias. Demo deliberately
  // ignores it so a legacy .env file can never redirect Demo mutations to Live.
  const activeDatabaseUrl = runtimeMode === "demo"
    ? demoDatabaseUrl
    : environment.DATABASE_URL?.trim() || configuredRuntimeUrl;
  if (normalizeDatabaseUrl(activeDatabaseUrl) !== normalizeDatabaseUrl(configuredRuntimeUrl)) throw new Error(`DATABASE_URL does not match the configured ${runtimeMode.toUpperCase()} database.`);
  if (runtimeMode === "demo" && normalizeDatabaseUrl(activeDatabaseUrl) === normalizeDatabaseUrl(liveDatabaseUrl)) throw new Error("Demo runtime refused to bind to the Live database.");
  return { runtimeMode, liveDatabaseUrl, demoDatabaseUrl, activeDatabaseUrl } as const;
}

export const { runtimeMode, liveDatabaseUrl, demoDatabaseUrl, activeDatabaseUrl } = resolveRuntimeConfiguration(process.env);

export function assertDemoDatabaseSafety() {
  if (runtimeMode !== "demo") throw new Error("Demo control is disabled in the Live runtime.");
  if (normalizeDatabaseUrl(activeDatabaseUrl) !== normalizeDatabaseUrl(demoDatabaseUrl)) throw new Error("Demo control refused: active database is not the configured Demo database.");
  if (normalizeDatabaseUrl(activeDatabaseUrl) === normalizeDatabaseUrl(liveDatabaseUrl)) throw new Error("Demo control refused: active database equals the Live database.");
  return { runtimeMode, databaseName: databaseName(activeDatabaseUrl) } as const;
}

export function publicRuntimeInfo() {
  return { mode: runtimeMode, database: databaseName(activeDatabaseUrl), demoEnabled: true, isolated: normalizeDatabaseUrl(liveDatabaseUrl) !== normalizeDatabaseUrl(demoDatabaseUrl) } as const;
}
