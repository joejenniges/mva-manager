import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { config } from "../config.js";
import * as schema from "./schema/index.js";

export type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

let pool: pg.Pool | null = null;
let db: DrizzleDb | null = null;

export async function connectDb(): Promise<DrizzleDb> {
  if (db) return db;

  pool = new pg.Pool({ connectionString: config.databaseUrl });

  // Verify connection
  const client = await pool.connect();
  client.release();

  db = drizzle(pool, { schema });

  // Run migrations
  await migrate(db, { migrationsFolder: "./drizzle" });

  return db;
}

export function getDb(): DrizzleDb {
  if (!db) throw new Error("Database not connected. Call connectDb() first.");
  return db;
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
  }
}
