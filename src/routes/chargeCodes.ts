import { Router } from "express";
import { validate } from "../middleware/validation.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/authorize.js";
import { UuidParam, PaginationQuery } from "../schemas/common.js";
import { CreateChargeCodeSchema, UpdateChargeCodeSchema } from "../schemas/chargeCodes.js";
import * as service from "../services/chargeCodes.js";

const router = Router();
router.use(requireAuth);

router.get("/", validate(PaginationQuery, "query"), async (req, res, next) => {
  try {
    res.json(await service.listChargeCodes(res.locals.eventId, res.locals.query));
  } catch (err) { next(err); }
});

router.get("/:id", validate(UuidParam, "params"), async (req, res, next) => {
  try {
    res.json(await service.getChargeCode(res.locals.eventId, res.locals.params.id));
  } catch (err) { next(err); }
});

router.post("/", requirePermission("edit", "charge_codes"), validate(CreateChargeCodeSchema), async (req, res, next) => {
  try {
    res.status(201).json(await service.createChargeCode(res.locals.eventId, req.body));
  } catch (err) { next(err); }
});

router.patch("/:id", requirePermission("edit", "charge_codes"), validate(UuidParam, "params"), validate(UpdateChargeCodeSchema), async (req, res, next) => {
  try {
    res.json(await service.updateChargeCode(res.locals.eventId, res.locals.params.id, req.body));
  } catch (err) { next(err); }
});

router.delete("/:id", requirePermission("delete", "charge_codes"), validate(UuidParam, "params"), async (req, res, next) => {
  try {
    await service.deleteChargeCode(res.locals.eventId, res.locals.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
});

export { router as chargeCodesRouter };
