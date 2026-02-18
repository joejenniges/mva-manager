import { lt } from "drizzle-orm";
import { getDb } from "./connection.js";
import { sessions } from "./schema/index.js";
import { logger } from "../logger.js";

// WHY: Same pattern as journaling-service. Application code already rejects
// expired sessions on read. This just prevents unbounded row growth.
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

let timer: ReturnType<typeof setInterval> | null = null;

async function cleanup(): Promise<void> {
  try {
    const db = getDb();
    const now = new Date();
    await db.delete(sessions).where(lt(sessions.expiresAt, now));
  } catch (err) {
    logger.error({ err }, "Session cleanup failed");
  }
}

export function startCleanup(): void {
  cleanup();
  timer = setInterval(cleanup, CLEANUP_INTERVAL_MS);
}

export function stopCleanup(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
