import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/lib/db/schema";
import { activeDatabaseUrl, runtimeMode } from "@/lib/runtime/config";

const globalForDatabase = globalThis as unknown as { databaseClients?: Partial<Record<typeof runtimeMode, ReturnType<typeof postgres>>> };
const clients = globalForDatabase.databaseClients ?? {};
const queryClient = clients[runtimeMode] ?? postgres(activeDatabaseUrl, { max: 8, idle_timeout: 20, connect_timeout: 10 });

if (process.env.NODE_ENV !== "production") { clients[runtimeMode] = queryClient; globalForDatabase.databaseClients = clients; }

export const db = drizzle(queryClient, { schema });
export { queryClient };
