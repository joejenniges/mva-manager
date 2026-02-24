import type { Request, Response, NextFunction } from "express";
import { AppError } from "./errors.js";
import { ERROR_CODES } from "../constants.js";
import { getUserEventAccess } from "../services/userAccess.js";
import type { EntityType, EventPermissions } from "../types.js";

// WHY: Three-tier authorization that runs after requireAuth + requireEvent.
// Admin users (from ADMIN_EMAILS env) bypass all checks. Non-admins need
// a user_event_access row to even see an event, and specific permission
// entries to perform write operations.

/**
 * Checks that the user has access to the current event (from res.locals.eventId).
 * Admins pass through. Non-admins need a user_event_access row.
 * Stores permissions in res.locals.permissions for downstream middleware.
 */
export async function requireEventAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (req.user?.isAdmin) {
    res.locals.permissions = null; // null = full access
    return next();
  }

  const userId = req.user?.id;
  const eventId = res.locals.eventId;

  if (!userId || !eventId) {
    return next(new AppError(403, ERROR_CODES.FORBIDDEN, "Access denied"));
  }

  const permissions = await getUserEventAccess(userId, eventId);
  if (!permissions) {
    return next(new AppError(403, ERROR_CODES.FORBIDDEN, "No access to this event"));
  }

  res.locals.permissions = permissions;
  next();
}

/**
 * Middleware factory: checks that the user has a specific permission for an entity.
 * Must run after requireEventAccess (which sets res.locals.permissions).
 */
export function requirePermission(action: "edit" | "delete", entity: EntityType) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.user?.isAdmin) return next();

    const permissions: EventPermissions | null = res.locals.permissions;

    // null permissions shouldn't happen after requireEventAccess for non-admins,
    // but handle defensively
    if (!permissions) {
      return next(new AppError(403, ERROR_CODES.FORBIDDEN, "Access denied"));
    }

    const allowed = permissions[action];
    if (!allowed || !allowed.includes(entity)) {
      return next(new AppError(403, ERROR_CODES.FORBIDDEN, `No ${action} permission for ${entity}`));
    }

    next();
  };
}

/**
 * Rejects non-admin users with 403.
 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user?.isAdmin) {
    return next(new AppError(403, ERROR_CODES.FORBIDDEN, "Admin access required"));
  }
  next();
}
