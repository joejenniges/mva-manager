import { Router } from "express";
import path from "node:path";
import fs from "node:fs";
import { validate } from "../middleware/validation.js";
import { requireAuth } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import { UuidParam } from "../schemas/common.js";
import { DocumentMetadataSchema, UpdateDocumentSchema, DocumentListQuery, LinkAppointmentSchema, DocumentAppointmentParam } from "../schemas/documents.js";
import * as service from "../services/documents.js";
import { config } from "../config.js";

const router = Router();
router.use(requireAuth);

router.get("/", validate(DocumentListQuery, "query"), async (req, res, next) => {
  try {
    res.json(await service.listDocuments(res.locals.eventId, res.locals.query));
  } catch (err) { next(err); }
});

router.get("/:id", validate(UuidParam, "params"), async (req, res, next) => {
  try {
    res.json(await service.getDocument(res.locals.eventId, res.locals.params.id));
  } catch (err) { next(err); }
});

// Serve the actual file
router.get("/:id/file", validate(UuidParam, "params"), async (req, res, next) => {
  try {
    const file = await service.getDocumentFile(res.locals.eventId, res.locals.params.id);
    const filePath = path.resolve(config.uploadDir, file.storedFilename);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "File not found on disk" } });
      return;
    }

    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${file.originalFilename}"`);
    res.sendFile(filePath);
  } catch (err) { next(err); }
});

// Upload new document (multipart form: file + JSON metadata in body fields)
router.post("/", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "No file uploaded" } });
      return;
    }

    // Parse metadata from form fields
    const meta = DocumentMetadataSchema.parse(req.body);

    const doc = await service.createDocument(res.locals.eventId, req.file, meta, req.user!.id);
    res.status(201).json(doc);
  } catch (err) { next(err); }
});

router.patch("/:id", validate(UuidParam, "params"), validate(UpdateDocumentSchema), async (req, res, next) => {
  try {
    res.json(await service.updateDocument(res.locals.eventId, res.locals.params.id, req.body));
  } catch (err) { next(err); }
});

// Link/unlink document to/from appointment
router.post("/:id/appointments", validate(UuidParam, "params"), validate(LinkAppointmentSchema), async (req, res, next) => {
  try {
    const doc = await service.addDocumentAppointmentLink(res.locals.eventId, res.locals.params.id, req.body.appointmentId);
    res.status(201).json(doc);
  } catch (err) { next(err); }
});

router.delete("/:id/appointments/:appointmentId", validate(DocumentAppointmentParam, "params"), async (req, res, next) => {
  try {
    await service.removeDocumentAppointmentLink(res.locals.eventId, res.locals.params.id, res.locals.params.appointmentId);
    res.status(204).end();
  } catch (err) { next(err); }
});

router.delete("/:id", validate(UuidParam, "params"), async (req, res, next) => {
  try {
    const storedFilename = await service.deleteDocument(res.locals.eventId, res.locals.params.id);
    // Best-effort delete file from disk
    const filePath = path.resolve(config.uploadDir, storedFilename);
    fs.unlink(filePath, () => {});
    res.status(204).end();
  } catch (err) { next(err); }
});

export { router as documentsRouter };
