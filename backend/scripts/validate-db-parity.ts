import { readFile } from "fs/promises";
import { join } from "path";
import postgres from "postgres";
import journal from "../drizzle/meta/_journal.json";
import { demoDatabaseUrl, liveDatabaseUrl } from "../src/lib/runtime/config";
import { acceptedMigrationHashes, type AppliedMigration, validateMigrationJournal } from "../src/lib/runtime/migration-validation";

const drizzleDirectory = join(process.cwd(), "drizzle");

async function expectedMigrations() {
  return Promise.all(journal.entries.map(async (entry) => {
    const sql = await readFile(join(drizzleDirectory, `${entry.tag}.sql`), "utf8");
    return { tag: entry.tag, createdAt: String(entry.when), acceptedHashes: acceptedMigrationHashes(sql) };
  }));
}

async function structure(url: string) {
  const client = postgres(url, { max: 1, connect_timeout: 10, idle_timeout: 5 });
  try {
    const [identity] = await client<{ database: string }[]>`select current_database() as database`;
    const tables = await client`select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name`;
    const columns = await client`select table_name, column_name, ordinal_position, data_type, udt_name, is_nullable, column_default from information_schema.columns where table_schema = 'public' order by table_name, ordinal_position`;
    const constraints = await client`select c.conrelid::regclass::text as table_name, c.conname as constraint_name, c.contype as constraint_type, pg_get_constraintdef(c.oid, true) as definition from pg_constraint c join pg_namespace n on n.oid = c.connamespace where n.nspname = 'public' and c.conname !~ '^\\d+_\\d+_\\d+_not_null$' order by c.conrelid::regclass::text, c.conname, pg_get_constraintdef(c.oid, true)`;
    const indexes = await client`select tablename, indexname, indexdef from pg_indexes where schemaname = 'public' order by tablename, indexname`;
    const enums = await client`select t.typname, e.enumlabel, e.enumsortorder from pg_type t join pg_enum e on t.oid = e.enumtypid join pg_namespace n on n.oid = t.typnamespace where n.nspname = 'public' order by t.typname, e.enumsortorder`;
    const migrations = await client<AppliedMigration[]>`select hash, created_at from "drizzle"."__drizzle_migrations" order by created_at`;
    return { identity, tables, columns, constraints, indexes, enums, migrations };
  } finally {
    await client.end({ timeout: 5 });
  }
}

async function main() {
  if (liveDatabaseUrl === demoDatabaseUrl) throw new Error("Parity refused: Live and Demo URLs match.");
  const expected = await expectedMigrations();
  const [live, demo] = await Promise.all([structure(liveDatabaseUrl), structure(demoDatabaseUrl)]);
  if (!live.identity?.database || !demo.identity?.database || live.identity.database === demo.identity.database) throw new Error("Parity refused: database identity is missing or not isolated.");
  validateMigrationJournal(live.identity.database, live.migrations, expected);
  validateMigrationJournal(demo.identity.database, demo.migrations, expected);
  const semanticSections = ["tables", "columns", "constraints", "indexes", "enums"] as const;
  const mismatches = semanticSections.filter((key) => JSON.stringify(live[key]) !== JSON.stringify(demo[key]));
  if (mismatches.length) throw new Error(`Live/Demo semantic structure differs: ${mismatches.join(", ")}.`);
  console.log(`DB parity passed: ${live.tables.length} tables, ${live.columns.length} columns, ${live.constraints.length} semantic constraints, ${live.indexes.length} indexes, ${live.enums.length} enum values, ${expected.length} verified migrations.`);
}

void main();
