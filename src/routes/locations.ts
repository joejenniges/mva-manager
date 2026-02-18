import { Router } from "express";
import { validate } from "../middleware/validation.js";
import { requireAuth } from "../middleware/auth.js";
import { UuidParam, PaginationQuery } from "../schemas/common.js";
import { CreateLocationSchema, UpdateLocationSchema } from "../schemas/locations.js";
import * as service from "../services/locations.js";

const router = Router();
router.use(requireAuth);

router.get("/", validate(PaginationQuery, "query"), async (req, res, next) => {
  try {
    res.json(await service.listLocations(res.locals.eventId, res.locals.query));
  } catch (err) { next(err); }
});

router.get("/:id", validate(UuidParam, "params"), async (req, res, next) => {
  try {
    res.json(await service.getLocation(res.locals.eventId, res.locals.params.id));
  } catch (err) { next(err); }
});

router.post("/", validate(CreateLocationSchema), async (req, res, next) => {
  try {
    res.status(201).json(await service.createLocation(res.locals.eventId, req.body));
  } catch (err) { next(err); }
});

router.patch("/:id", validate(UuidParam, "params"), validate(UpdateLocationSchema), async (req, res, next) => {
  try {
    res.json(await service.updateLocation(res.locals.eventId, res.locals.params.id, req.body));
  } catch (err) { next(err); }
});

router.delete("/:id", validate(UuidParam, "params"), async (req, res, next) => {
  try {
    await service.deleteLocation(res.locals.eventId, res.locals.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
});

export { router as locationsRouter };
