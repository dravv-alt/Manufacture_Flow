import { defineConfig } from "drizzle-kit";
import { activeDatabaseUrl } from "./src/lib/runtime/config";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: activeDatabaseUrl,
  },
});
