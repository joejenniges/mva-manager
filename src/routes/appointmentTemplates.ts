import { Router } from "express";
import { validate } from "../middleware/validation.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/authorize.js";
import { PaginationQuery, UuidParam } from "../schemas/common.js";
import { CreateAppointmentTemplateSchema, UpdateAppointmentTemplateSchema } from "../schemas/appointmentTemplates.js";
import * as svc from "../services/appointmentTemplates.js";

const router = Router();
router.use(requireAuth);

router.get("/", validate(PaginationQuery, "query"), async (req, res, next) => {
  try {
    const result = await svc.listAppointmentTemplates(res.locals.eventId, res.locals.query);
    res.json(result);
  } catch (err) { next(err); }
});

router.get("/:id", validate(UuidParam, "params"), async (req, res, next) => {
  try {
    const row = await svc.getAppointmentTemplate(res.locals.eventId, res.locals.params.id);
    res.json(row);
  } catch (err) { next(err); }
});

router.post("/", requirePermission("edit", "templates"), validate(CreateAppointmentTemplateSchema), async (req, res, next) => {
  try {
    const row = await svc.createAppointmentTemplate(res.locals.eventId, req.body);
    res.status(201).json(row);
  } catch (err) { next(err); }
});

router.patch("/:id", requirePermission("edit", "templates"), validate(UuidParam, "params"), validate(UpdateAppointmentTemplateSchema), async (req, res, next) => {
  try {
    const row = await svc.updateAppointmentTemplate(res.locals.eventId, res.locals.params.id, req.body);
    res.json(row);
  } catch (err) { next(err); }
});

router.delete("/:id", requirePermission("delete", "templates"), validate(UuidParam, "params"), async (req, res, next) => {
  try {
    await svc.deleteAppointmentTemplate(res.locals.eventId, res.locals.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
});

export { router as appointmentTemplatesRouter };
