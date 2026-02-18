import { Router } from "express";
import { validate } from "../middleware/validation.js";
import { requireAuth } from "../middleware/auth.js";
import { UuidParam, PaginationQuery } from "../schemas/common.js";
import { CreateActivitySchema, UpdateActivitySchema } from "../schemas/activities.js";
import * as service from "../services/activities.js";

const router = Router();
router.use(requireAuth);

router.get("/", validate(PaginationQuery, "query"), async (req, res, next) => {
  try {
    res.json(await service.listActivities(res.locals.eventId, res.locals.query));
  } catch (err) { next(err); }
});

router.get("/:id", validate(UuidParam, "params"), async (req, res, next) => {
  try {
    res.json(await service.getActivity(res.locals.eventId, res.locals.params.id));
  } catch (err) { next(err); }
});

router.post("/", validate(CreateActivitySchema), async (req, res, next) => {
  try {
    res.status(201).json(await service.createActivity(res.locals.eventId, req.body));
  } catch (err) { next(err); }
});

router.patch("/:id", validate(UuidParam, "params"), validate(UpdateActivitySchema), async (req, res, next) => {
  try {
    res.json(await service.updateActivity(res.locals.eventId, res.locals.params.id, req.body));
  } catch (err) { next(err); }
});

router.delete("/:id", validate(UuidParam, "params"), async (req, res, next) => {
  try {
    await service.deleteActivity(res.locals.eventId, res.locals.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
});

export { router as activitiesRouter };
