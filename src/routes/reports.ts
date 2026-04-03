import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validation.js";
import { ReportAppointmentsBody } from "../schemas/reports.js";
import { getReportAppointments } from "../services/reports.js";

const router = Router();
router.use(requireAuth);

router.post("/appointments", validate(ReportAppointmentsBody, "body"), async (req, res, next) => {
  try {
    const eventId = res.locals.eventId as string;
    const { appointmentIds } = req.body as { appointmentIds: string[] };
    const data = await getReportAppointments(eventId, appointmentIds);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

export { router as reportsRouter };
