import { Router } from "express";
import { validate } from "../middleware/validation.js";
import { requireAuth } from "../middleware/auth.js";
import { UuidParam } from "../schemas/common.js";
import { CreateAppointmentSchema, UpdateAppointmentSchema, AppointmentListQuery, CreateCostItemSchema, UpdateCostItemSchema, BulkCreateCostItemsSchema } from "../schemas/appointments.js";
import * as service from "../services/appointments.js";

const router = Router();
router.use(requireAuth);

// --- Appointments ---

router.get("/", validate(AppointmentListQuery, "query"), async (req, res, next) => {
  try {
    res.json(await service.listAppointments(res.locals.eventId, res.locals.query));
  } catch (err) { next(err); }
});

router.get("/:id", validate(UuidParam, "params"), async (req, res, next) => {
  try {
    res.json(await service.getAppointment(res.locals.eventId, res.locals.params.id));
  } catch (err) { next(err); }
});

router.post("/", validate(CreateAppointmentSchema), async (req, res, next) => {
  try {
    res.status(201).json(await service.createAppointment(res.locals.eventId, req.body));
  } catch (err) { next(err); }
});

router.patch("/:id", validate(UuidParam, "params"), validate(UpdateAppointmentSchema), async (req, res, next) => {
  try {
    res.json(await service.updateAppointment(res.locals.eventId, res.locals.params.id, req.body));
  } catch (err) { next(err); }
});

router.delete("/:id", validate(UuidParam, "params"), async (req, res, next) => {
  try {
    await service.deleteAppointment(res.locals.eventId, res.locals.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
});

// --- Cost Items ---

router.post("/:id/cost-items", validate(UuidParam, "params"), validate(CreateCostItemSchema), async (req, res, next) => {
  try {
    res.status(201).json(await service.createCostItem(res.locals.eventId, res.locals.params.id, req.body));
  } catch (err) { next(err); }
});

router.post("/:id/cost-items/bulk", validate(UuidParam, "params"), validate(BulkCreateCostItemsSchema), async (req, res, next) => {
  try {
    res.status(201).json(await service.bulkCreateCostItems(res.locals.eventId, res.locals.params.id, req.body.items));
  } catch (err) { next(err); }
});

router.patch("/cost-items/:id", validate(UuidParam, "params"), validate(UpdateCostItemSchema), async (req, res, next) => {
  try {
    res.json(await service.updateCostItem(res.locals.params.id, req.body));
  } catch (err) { next(err); }
});

router.delete("/cost-items/:id", validate(UuidParam, "params"), async (req, res, next) => {
  try {
    await service.deleteCostItem(res.locals.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
});

export { router as appointmentsRouter };
