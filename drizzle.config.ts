import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/server/schema/index.ts",
  out: "./database/migrations-drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
