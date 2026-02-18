import { Router } from "express";
import { healthRouter } from "./health.js";
import { requireAuth } from "../middleware/auth.js";
import { requireEvent } from "../middleware/event.js";
import { createSession } from "../services/sessions.js";
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

const router = Router();

router.use(healthRouter);

// Auth endpoints
router.post("/auth/session", requireAuth, async (req, res, next) => {
  try {
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

router.get("/me", requireAuth, (req, res) => {
  res.json(req.user);
});

// Event CRUD -- NOT scoped to an event (they ARE the events)
router.use("/events", eventsRouter);

// Exempt from event scoping
router.use("/distance", distanceRouter);
router.use("/geocode", geocodeRouter);

// Entity routes -- scoped to active event via requireEvent middleware
router.use("/person-roles", requireEvent, personRolesRouter);
router.use("/activities", requireEvent, activitiesRouter);
router.use("/document-types", requireEvent, documentTypesRouter);
router.use("/locations", requireEvent, locationsRouter);
router.use("/persons", requireEvent, personsRouter);
router.use("/organizations", requireEvent, organizationsRouter);
router.use("/appointments", requireEvent, appointmentsRouter);
router.use("/documents", requireEvent, documentsRouter);
router.use("/appointment-templates", requireEvent, appointmentTemplatesRouter);
router.use("/calendar", requireEvent, calendarRouter);
router.use("/mileage", requireEvent, mileageRouter);

export { router as apiRouter };
