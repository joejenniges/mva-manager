import { Router } from "express";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/authorize.js";
import { validate } from "../middleware/validation.js";
import { AddUserSchema, SetPermissionsSchema, UserIdParam, UserEventParam } from "../schemas/admin.js";
import { findOrCreateUser } from "../middleware/auth.js";
import { getDb } from "../db/connection.js";
import { users } from "../db/schema/index.js";
import { config } from "../config.js";
import * as userAccessService from "../services/userAccess.js";

const router = Router();
router.use(requireAuth, requireAdmin);

// List all users
router.get("/users", async (_req, res, next) => {
  try {
    const db = getDb();
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(users.email);

    const data = allUsers.map((u) => ({
      ...u,
      isAdmin: config.adminEmails.includes(u.email.toLowerCase()),
    }));

    res.json({ data });
  } catch (err) { next(err); }
});

// Add user by email (creates user record if needed)
router.post("/users", validate(AddUserSchema), async (req, res, next) => {
  try {
    const { email, name } = req.body;
    const user = await findOrCreateUser(email, name || email.split("@")[0], null);
    res.status(201).json({
      ...user,
      isAdmin: config.adminEmails.includes(email.toLowerCase()),
    });
  } catch (err) { next(err); }
});

// Get all event access for a user
router.get("/users/:userId/access", validate(UserIdParam, "params"), async (req, res, next) => {
  try {
    const rows = await userAccessService.listUserEventAccess(res.locals.params.userId);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// Set permissions for user on event (upsert)
router.put("/users/:userId/access/:eventId", validate(UserEventParam, "params"), validate(SetPermissionsSchema), async (req, res, next) => {
  try {
    const row = await userAccessService.setUserEventAccess(
      res.locals.params.userId,
      res.locals.params.eventId,
      req.body.permissions,
    );
    res.json(row);
  } catch (err) { next(err); }
});

// Remove access for user on event
router.delete("/users/:userId/access/:eventId", validate(UserEventParam, "params"), async (req, res, next) => {
  try {
    await userAccessService.removeUserEventAccess(res.locals.params.userId, res.locals.params.eventId);
    res.status(204).end();
  } catch (err) { next(err); }
});

export { router as adminRouter };
