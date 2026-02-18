import { Router } from "express";
import { sql } from "drizzle-orm";
import { getDb } from "../db/connection.js";

const router = Router();

router.get("/health", async (_req, res) => {
  try {
    const db = getDb();
    await db.execute(sql`SELECT 1`);

    res.json({
      status: "ok",
      version: "1.0.0",
      db: "connected",
      uptime: process.uptime(),
    });
  } catch {
    res.status(503).json({
      status: "error",
      db: "disconnected",
      uptime: process.uptime(),
    });
  }
});

export { router as healthRouter };
