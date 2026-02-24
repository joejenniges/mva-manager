import type { Request, Response, NextFunction } from "express";
import { OAuth2Client } from "google-auth-library";
import { eq, and, gt } from "drizzle-orm";
import { config } from "../config.js";
import { AppError } from "./errors.js";
import { ERROR_CODES } from "../constants.js";
import type { UserInfo } from "../types.js";
import { logger } from "../logger.js";
import { getDb } from "../db/connection.js";
import { users, sessions } from "../db/schema/index.js";

const oauthClient = new OAuth2Client(config.googleClientId);

// Augment Express Request with user info
declare global {
  namespace Express {
    interface Request {
      user?: UserInfo;
    }
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    req.user = await authenticateRequest(req);
    next();
  } catch (err) {
    if (err instanceof AppError) {
      next(err);
    } else {
      logger.warn({ err }, "Token verification failed");
      next(new AppError(401, ERROR_CODES.UNAUTHORIZED, "Invalid or expired token"));
    }
  }
}

async function authenticateRequest(req: Request): Promise<UserInfo> {
  // Dev mode: accept X-Dev-User header
  if (config.nodeEnv === "development" && req.headers["x-dev-user"]) {
    const email = req.headers["x-dev-user"] as string;
    const user = await findOrCreateUser(email, "Dev User", null);
    return { ...user, isAdmin: config.adminEmails.includes(email.toLowerCase()) };
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AppError(401, ERROR_CODES.UNAUTHORIZED, "Missing or invalid Authorization header");
  }

  const token = authHeader.slice(7);

  // Check session tokens first (avoids round-trip to Google)
  const sessionUser = await verifySession(token);
  if (sessionUser) return sessionUser;

  // Fall back to verifying as a Google token
  return verifyGoogleToken(token);
}

async function verifySession(token: string): Promise<UserInfo | null> {
  const db = getDb();
  const row = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      avatarUrl: users.avatarUrl,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1);

  if (row.length === 0) return null;
  const user = row[0];
  return { ...user, isAdmin: config.adminEmails.includes(user.email.toLowerCase()) };
}

async function verifyGoogleToken(token: string): Promise<UserInfo> {
  let email: string;
  let name: string | undefined;
  let avatarUrl: string | undefined;

  // Try as ID token first
  try {
    const ticket = await oauthClient.verifyIdToken({
      idToken: token,
      audience: config.googleClientId,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) throw new Error("No email in token payload");
    email = payload.email;
    name = payload.name;
    avatarUrl = payload.picture;
  } catch {
    // Fall back to access token verification
    const tokenInfo = await oauthClient.getTokenInfo(token);
    if (!tokenInfo.email) throw new Error("No email in token info");
    email = tokenInfo.email;
  }

  // WHY: Login gating moved to session creation (POST /auth/session).
  // Authentication (who are you?) is separate from authorization (what can you do?).
  // Anyone with a valid Google token can authenticate; session creation checks
  // if they're an admin or have any event access before issuing a session.
  const user = await findOrCreateUser(email, name || email.split("@")[0], avatarUrl || null);
  return { ...user, isAdmin: config.adminEmails.includes(email.toLowerCase()) };
}

async function findOrCreateUser(email: string, name: string, avatarUrl: string | null): Promise<Omit<UserInfo, "isAdmin">> {
  const db = getDb();

  // Upsert: create user if not exists, update name/avatar if they changed
  const result = await db
    .insert(users)
    .values({ email, name, avatarUrl })
    .onConflictDoUpdate({
      target: users.email,
      set: { name, avatarUrl, updatedAt: new Date() },
    })
    .returning({ id: users.id, email: users.email, name: users.name, avatarUrl: users.avatarUrl });

  return result[0];
}

export { findOrCreateUser };
