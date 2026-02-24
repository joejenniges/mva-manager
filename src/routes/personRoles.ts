import { Router } from "express";
import { validate } from "../middleware/validation.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/authorize.js";
import { UuidParam, PaginationQuery } from "../schemas/common.js";
import { CreatePersonRoleSchema, UpdatePersonRoleSchema } from "../schemas/personRoles.js";
import * as service from "../services/personRoles.js";

const router = Router();
router.use(requireAuth);

router.get("/", validate(PaginationQuery, "query"), async (req, res, next) => {
  try {
    res.json(await service.listPersonRoles(res.locals.eventId, res.locals.query));
  } catch (err) { next(err); }
});

router.get("/:id", validate(UuidParam, "params"), async (req, res, next) => {
  try {
    res.json(await service.getPersonRole(res.locals.eventId, res.locals.params.id));
  } catch (err) { next(err); }
});

router.post("/", requirePermission("edit", "person_roles"), validate(CreatePersonRoleSchema), async (req, res, next) => {
  try {
    res.status(201).json(await service.createPersonRole(res.locals.eventId, req.body));
  } catch (err) { next(err); }
});

router.patch("/:id", requirePermission("edit", "person_roles"), validate(UuidParam, "params"), validate(UpdatePersonRoleSchema), async (req, res, next) => {
  try {
    res.json(await service.updatePersonRole(res.locals.eventId, res.locals.params.id, req.body));
  } catch (err) { next(err); }
});

router.delete("/:id", requirePermission("delete", "person_roles"), validate(UuidParam, "params"), async (req, res, next) => {
  try {
    await service.deletePersonRole(res.locals.eventId, res.locals.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
});

export { router as personRolesRouter };
