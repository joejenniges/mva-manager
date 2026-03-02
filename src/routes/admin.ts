import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/authorize.js";
import { validate } from "../middleware/validation.js";
import { AddUserSchema, SetPermissionsSchema, UserIdParam, UserEventParam } from "../schemas/admin.js";
import { findOrCreateUser } from "../middleware/auth.js";
import { getDb } from "../db/connection.js";
import { users, persons } from "../db/schema/index.js";
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

// Delete a non-admin user
router.delete("/users/:userId", validate(UserIdParam, "params"), async (req, res, next) => {
  try {
    const db = getDb();
    const { userId } = res.locals.params;

    // Look up the user to check they exist and aren't an admin
    const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (config.adminEmails.includes(user.email.toLowerCase())) {
      res.status(400).json({ error: "Cannot delete admin users" });
      return;
    }

    await db.delete(users).where(eq(users.id, userId));
    res.status(204).end();
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
      req.body.defaultPersonId,
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

// List patients (persons with isPatient=true) for a given event
const EventIdParam = z.object({ eventId: z.string().uuid() });

router.get("/events/:eventId/patients", validate(EventIdParam, "params"), async (req, res, next) => {
  try {
    const db = getDb();
    const rows = await db
      .select({ id: persons.id, name: persons.name, color: persons.color })
      .from(persons)
      .where(and(eq(persons.eventId, res.locals.params.eventId), eq(persons.isPatient, true)))
      .orderBy(persons.name);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

export { router as adminRouter };
