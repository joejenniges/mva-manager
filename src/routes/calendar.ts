import { Router } from "express";
import { validate } from "../middleware/validation.js";
import { requireAuth } from "../middleware/auth.js";
import { CalendarQuery } from "../schemas/appointmentTemplates.js";
import { getCalendarAppointments } from "../services/calendar.js";

const router = Router();
router.use(requireAuth);

router.get("/", validate(CalendarQuery, "query"), async (req, res, next) => {
  try {
    const { start, end } = res.locals.query;
    const data = await getCalendarAppointments(res.locals.eventId, start, end);
    res.json(data);
  } catch (err) { next(err); }
});

export { router as calendarRouter };
