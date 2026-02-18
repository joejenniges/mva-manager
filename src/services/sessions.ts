import { randomUUID } from "node:crypto";
import { getDb } from "../db/connection.js";
import { sessions } from "../db/schema/index.js";
import type { UserInfo } from "../types.js";

// WHY 7 days: Long enough that daily users don't get kicked out,
// short enough that a stolen token has limited window.
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function createSession(user: UserInfo): Promise<{ token: string; expiresAt: Date }> {
  const db = getDb();
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.insert(sessions).values({
    token,
    userId: user.id,
    expiresAt,
  });

  return { token, expiresAt };
}
