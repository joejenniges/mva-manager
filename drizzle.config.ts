import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5433/mva-manager",
  },
});
