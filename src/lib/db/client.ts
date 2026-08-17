import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/lib/db/schema";

const databaseUrl = process.env.DATABASE_URL ?? "postgresql://machine_overwatch:machine_overwatch@127.0.0.1:5434/machine_overwatch";

const globalForDatabase = globalThis as unknown as { databaseClient?: ReturnType<typeof postgres> };
const queryClient = globalForDatabase.databaseClient ?? postgres(databaseUrl, { max: 8, idle_timeout: 20, connect_timeout: 10 });

if (process.env.NODE_ENV !== "production") globalForDatabase.databaseClient = queryClient;

export const db = drizzle(queryClient, { schema });
export { queryClient };
