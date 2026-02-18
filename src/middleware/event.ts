import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { getDb } from "../db/connection.js";
import { events } from "../db/schema/index.js";
import { AppError } from "./errors.js";
import { ERROR_CODES } from "../constants.js";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function requireEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
  const eventId = req.headers["x-event-id"];

  if (!eventId || typeof eventId !== "string") {
    next(new AppError(400, ERROR_CODES.VALIDATION_ERROR, "Missing X-Event-Id header"));
    return;
  }

  if (!UUID_REGEX.test(eventId)) {
    next(new AppError(400, ERROR_CODES.VALIDATION_ERROR, "Invalid X-Event-Id format"));
    return;
  }

  const db = getDb();
  const row = await db.select({ id: events.id }).from(events).where(eq(events.id, eventId)).limit(1);

  if (row.length === 0) {
    next(new AppError(404, ERROR_CODES.NOT_FOUND, "Event not found"));
    return;
  }

  res.locals.eventId = eventId;
  next();
}
