import { createHash } from "crypto";
import postgres from "postgres";
import { seed } from "./seed-db";
import { queryClient } from "../src/lib/db/client";
import { liveDatabaseUrl, runtimeMode } from "../src/lib/runtime/config";

async function fingerprint() {
  const client = postgres(liveDatabaseUrl, { max: 1, connect_timeout: 10, idle_timeout: 5 });
  try {
    const tables = await client<{ table_name: string }[]>`select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name`;
    const state: Record<string, unknown[]> = {};
    for (const { table_name: table } of tables) {
      if (!/^[a-z0-9_]+$/.test(table)) throw new Error(`Unsafe table name returned by PostgreSQL: ${table}`);
      state[table] = await client.unsafe<unknown[]>(`select to_jsonb(t) as row from "${table}" t order by to_jsonb(t)::text`);
    }
    return createHash("sha256").update(JSON.stringify(state)).digest("hex");
  } finally {
    await client.end({ timeout: 5 });
  }
}

async function main() {
  if (runtimeMode !== "live") throw new Error("Live seed idempotency validation requires APP_RUNTIME=live.");
  await seed();
  const before = await fingerprint();
  await seed();
  const after = await fingerprint();
  if (before !== after) throw new Error("Live seed is not idempotent: a repeated seed changed persisted data.");
  console.log(`Live seed idempotency passed: ${before}.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => queryClient.end({ timeout: 5 }));
