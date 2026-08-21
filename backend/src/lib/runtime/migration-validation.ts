import { createHash } from "crypto";

export type AppliedMigration = { hash: string; created_at: string };
export type ExpectedMigration = { tag: string; createdAt: string; acceptedHashes: ReadonlySet<string> };

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function acceptedMigrationHashes(sql: string) {
  const lf = sql.replace(/\r\n/g, "\n");
  const crlf = lf.replace(/\n/g, "\r\n");
  return new Set([sha256(lf), sha256(crlf)]);
}

export function validateMigrationJournal(database: string, actual: AppliedMigration[], expected: ExpectedMigration[]) {
  if (actual.length !== expected.length) throw new Error(`${database} has ${actual.length} migration checkpoints; expected ${expected.length}.`);
  actual.forEach((row, index) => {
    const migration = expected[index];
    if (row.created_at !== migration.createdAt) throw new Error(`${database} migration ${index} timestamp does not match ${migration.tag}.`);
    if (!migration.acceptedHashes.has(row.hash)) throw new Error(`${database} migration ${migration.tag} differs from the checked-in SQL after line-ending normalization.`);
  });
}
