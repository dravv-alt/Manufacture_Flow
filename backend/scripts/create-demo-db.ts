import postgres from "postgres";
import { demoDatabaseUrl, liveDatabaseUrl } from "../src/lib/runtime/config";

function databaseName(value: string) {
  const name = decodeURIComponent(new URL(value).pathname.slice(1));
  if (!/^[a-zA-Z0-9_]+$/.test(name)) throw new Error("Database name contains unsupported characters.");
  return name;
}

function serverIdentity(url: URL) {
  return `${url.protocol}//${url.hostname.toLowerCase()}:${url.port || "5432"}`;
}

async function main() {
  const live = new URL(liveDatabaseUrl);
  const demo = new URL(demoDatabaseUrl);
  const liveName = databaseName(liveDatabaseUrl);
  const demoName = databaseName(demoDatabaseUrl);
  if (serverIdentity(live) !== serverIdentity(demo) || live.username !== demo.username) {
    throw new Error("Live and Demo must use the same PostgreSQL host, port, and configured owner.");
  }
  if (liveName === demoName) throw new Error("Demo database creation refused because Live and Demo names match.");

  const expectedOwner = decodeURIComponent(demo.username);
  demo.pathname = "/postgres";
  const admin = postgres(demo.toString(), { max: 1, connect_timeout: 10, idle_timeout: 5 });
  try {
    await admin`select pg_advisory_lock(hashtext('manufacture-flow:create-demo-database'))`;
    const databases = await admin<{ name: string; owner: string }[]>`
      select datname as name, pg_get_userbyid(datdba) as owner
      from pg_database
      where datname in (${liveName}, ${demoName})
    `;
    const liveDatabase = databases.find((database) => database.name === liveName);
    if (!liveDatabase) throw new Error(`Live database ${liveName} does not exist.`);
    if (liveDatabase.owner !== expectedOwner) throw new Error(`Live database ${liveName} is owned by ${liveDatabase.owner}; expected ${expectedOwner}.`);

    const demoDatabase = databases.find((database) => database.name === demoName);
    if (!demoDatabase) {
      await admin.unsafe(`create database "${demoName}" owner "${expectedOwner}"`);
      console.log(`Created isolated Demo database ${demoName}.`);
    } else {
      if (demoDatabase.owner !== expectedOwner) throw new Error(`Demo database ${demoName} is owned by ${demoDatabase.owner}; expected ${expectedOwner}.`);
      console.log(`Demo database ${demoName} already exists.`);
    }
    console.log(`Safety check: Live=${liveName}, Demo=${demoName}, server=${serverIdentity(live)}, owner=${expectedOwner}.`);
  } finally {
    try { await admin`select pg_advisory_unlock(hashtext('manufacture-flow:create-demo-database'))`; } catch { /* connection cleanup still runs */ }
    await admin.end({ timeout: 5 });
  }
}

void main();
