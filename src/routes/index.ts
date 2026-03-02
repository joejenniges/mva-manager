import { Router } from "express";
import { healthRouter } from "./health.js";
import { requireAuth } from "../middleware/auth.js";
import { requireEvent } from "../middleware/event.js";
import { requireEventAccess } from "../middleware/authorize.js";
import { createSession } from "../services/sessions.js";
import { checkUserHasAnyAccess, getUserEventAccess } from "../services/userAccess.js";
import { personRolesRouter } from "./personRoles.js";
import { activitiesRouter } from "./activities.js";
import { documentTypesRouter } from "./documentTypes.js";
import { locationsRouter } from "./locations.js";
import { personsRouter } from "./persons.js";
import { organizationsRouter } from "./organizations.js";
import { appointmentsRouter } from "./appointments.js";
import { documentsRouter } from "./documents.js";
import { distanceRouter } from "./distance.js";
import { appointmentTemplatesRouter } from "./appointmentTemplates.js";
import { calendarRouter } from "./calendar.js";
import { geocodeRouter } from "./geocode.js";
import { eventsRouter } from "./events.js";
import { mileageRouter } from "./mileage.js";
import { adminRouter } from "./admin.js";
import { dashboardRouter } from "./dashboard.js";

const router = Router();

router.use(healthRouter);

// Auth endpoints
router.post("/auth/session", requireAuth, async (req, res, next) => {
  try {
    // WHY: Login gating. Must be admin OR have at least one event access row.
    // This prevents random Google accounts from getting sessions.
    if (!req.user!.isAdmin) {
      const hasAccess = await checkUserHasAnyAccess(req.user!.id);
      if (!hasAccess) {
        res.status(403).json({
          error: { code: "FORBIDDEN", message: "No access granted. Contact an admin." },
        });
        return;
      }
    }

    const session = await createSession(req.user!);
    res.json({
      token: session.token,
      expiresAt: session.expiresAt.toISOString(),
      user: req.user,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/me", requireAuth, async (req, res) => {
  const user = req.user!;
  let permissions = null;

  // If non-admin, look up permissions for the active event
  if (!user.isAdmin) {
    const eventId = req.headers["x-event-id"];
    if (eventId && typeof eventId === "string") {
      permissions = await getUserEventAccess(user.id, eventId);
    }
  }

  res.json({ ...user, permissions });
});

// Admin user management
router.use("/admin", adminRouter);

// Event CRUD -- NOT scoped to an event (they ARE the events)
router.use("/events", eventsRouter);

// Exempt from event scoping
router.use("/distance", distanceRouter);
router.use("/geocode", geocodeRouter);

// Entity routes -- scoped to active event via requireAuth + requireEvent + requireEventAccess
router.use("/person-roles", requireAuth, requireEvent, requireEventAccess, personRolesRouter);
router.use("/activities", requireAuth, requireEvent, requireEventAccess, activitiesRouter);
router.use("/document-types", requireAuth, requireEvent, requireEventAccess, documentTypesRouter);
router.use("/locations", requireAuth, requireEvent, requireEventAccess, locationsRouter);
router.use("/persons", requireAuth, requireEvent, requireEventAccess, personsRouter);
router.use("/organizations", requireAuth, requireEvent, requireEventAccess, organizationsRouter);
router.use("/appointments", requireAuth, requireEvent, requireEventAccess, appointmentsRouter);
router.use("/documents", requireAuth, requireEvent, requireEventAccess, documentsRouter);
router.use("/appointment-templates", requireAuth, requireEvent, requireEventAccess, appointmentTemplatesRouter);
router.use("/calendar", requireAuth, requireEvent, requireEventAccess, calendarRouter);
router.use("/mileage", requireAuth, requireEvent, requireEventAccess, mileageRouter);
router.use("/dashboard", requireAuth, requireEvent, requireEventAccess, dashboardRouter);

export { router as apiRouter };
