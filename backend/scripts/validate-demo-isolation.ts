import { createHash } from "crypto";
import postgres from "postgres";
import { queryClient } from "../src/lib/db/client";
import { resetDemoScenario, triggerDemoTelemetry } from "../src/lib/demo/service";
import { assertDemoDatabaseSafety, liveDatabaseUrl } from "../src/lib/runtime/config";

async function fingerprint() {
  const client = postgres(liveDatabaseUrl, { max: 1, connect_timeout: 10, idle_timeout: 5 });
  try {
    const tables = await client<{ table_name: string }[]>`select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name`;
    const tableHashes: Record<string, string> = {};
    for (const { table_name: table } of tables) {
      if (!/^[a-z0-9_]+$/.test(table)) throw new Error(`Unsafe table name returned by PostgreSQL: ${table}`);
      const rows = await client.unsafe<{ row: unknown }[]>(`select to_jsonb(t) as row from "${table}" t order by to_jsonb(t)::text`);
      tableHashes[table] = createHash("sha256").update(JSON.stringify(rows)).digest("hex");
    }
    return tableHashes;
  } finally {
    await client.end({ timeout: 5 });
  }
}

async function main() {
  assertDemoDatabaseSafety();
  const before = await fingerprint();
  await resetDemoScenario("golden");
  const result = await triggerDemoTelemetry("golden");
  const after = await fingerprint();
  const changedTables = Object.keys(before).filter((table) => before[table] !== after[table]);
  if (changedTables.length) throw new Error(`LIVE CONTAMINATION DETECTED in: ${changedTables.join(", ")}.`);
  console.log(JSON.stringify({ isolation: "passed", verifiedLiveTables: Object.keys(before).length, demoRecoveryStatus: result.graph.run?.status }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => queryClient.end({ timeout: 5 }));
