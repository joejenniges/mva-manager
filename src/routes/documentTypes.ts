import { Router } from "express";
import { validate } from "../middleware/validation.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/authorize.js";
import { UuidParam, PaginationQuery } from "../schemas/common.js";
import { CreateDocumentTypeSchema, UpdateDocumentTypeSchema } from "../schemas/documentTypes.js";
import * as service from "../services/documentTypes.js";

const router = Router();
router.use(requireAuth);

router.get("/", validate(PaginationQuery, "query"), async (req, res, next) => {
  try {
    res.json(await service.listDocumentTypes(res.locals.eventId, res.locals.query));
  } catch (err) { next(err); }
});

router.get("/:id", validate(UuidParam, "params"), async (req, res, next) => {
  try {
    res.json(await service.getDocumentType(res.locals.eventId, res.locals.params.id));
  } catch (err) { next(err); }
});

router.post("/", requirePermission("edit", "doc_types"), validate(CreateDocumentTypeSchema), async (req, res, next) => {
  try {
    res.status(201).json(await service.createDocumentType(res.locals.eventId, req.body));
  } catch (err) { next(err); }
});

router.patch("/:id", requirePermission("edit", "doc_types"), validate(UuidParam, "params"), validate(UpdateDocumentTypeSchema), async (req, res, next) => {
  try {
    res.json(await service.updateDocumentType(res.locals.eventId, res.locals.params.id, req.body));
  } catch (err) { next(err); }
});

router.delete("/:id", requirePermission("delete", "doc_types"), validate(UuidParam, "params"), async (req, res, next) => {
  try {
    await service.deleteDocumentType(res.locals.eventId, res.locals.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
});

export { router as documentTypesRouter };
