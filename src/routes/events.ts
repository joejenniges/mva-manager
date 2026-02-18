import { Router } from "express";
import { validate } from "../middleware/validation.js";
import { requireAuth } from "../middleware/auth.js";
import { UuidParam } from "../schemas/common.js";
import { CreateEventSchema, UpdateEventSchema, EventListQuery } from "../schemas/events.js";
import * as service from "../services/events.js";

const router = Router();
router.use(requireAuth);

router.get("/", validate(EventListQuery, "query"), async (req, res, next) => {
  try {
    res.json(await service.listEvents(res.locals.query));
  } catch (err) { next(err); }
});

router.get("/:id", validate(UuidParam, "params"), async (req, res, next) => {
  try {
    res.json(await service.getEvent(res.locals.params.id));
  } catch (err) { next(err); }
});

router.post("/", validate(CreateEventSchema), async (req, res, next) => {
  try {
    res.status(201).json(await service.createEvent(req.body));
  } catch (err) { next(err); }
});

router.patch("/:id", validate(UuidParam, "params"), validate(UpdateEventSchema), async (req, res, next) => {
  try {
    res.json(await service.updateEvent(res.locals.params.id, req.body));
  } catch (err) { next(err); }
});

router.delete("/:id", validate(UuidParam, "params"), async (req, res, next) => {
  try {
    await service.deleteEvent(res.locals.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
});

export { router as eventsRouter };
