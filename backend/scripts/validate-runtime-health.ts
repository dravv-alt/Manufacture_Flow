import { GET } from "../src/app/api/health/route";
import { queryClient } from "../src/lib/db/client";
import { publicRuntimeInfo } from "../src/lib/runtime/config";

async function main() {
  const expected = publicRuntimeInfo();
  const response = await GET();
  const body = await response.json() as { status?: string; runtime?: { mode?: string; database?: string }; reason?: string };
  if (!response.ok || body.status !== "ok") throw new Error(`Health check failed for ${expected.mode}: ${body.reason ?? response.status}.`);
  if (body.runtime?.mode !== expected.mode || body.runtime?.database !== expected.database) {
    throw new Error(`Health identity mismatch: expected ${expected.mode}/${expected.database}, received ${body.runtime?.mode}/${body.runtime?.database}.`);
  }
  console.log(`Runtime health passed: ${expected.mode} -> ${expected.database}.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => queryClient.end({ timeout: 5 }));
