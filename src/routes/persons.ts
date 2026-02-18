import { Router } from "express";
import { validate } from "../middleware/validation.js";
import { requireAuth } from "../middleware/auth.js";
import { UuidParam } from "../schemas/common.js";
import { PersonListQuery, CreatePersonSchema, UpdatePersonSchema } from "../schemas/persons.js";
import * as service from "../services/persons.js";

const router = Router();
router.use(requireAuth);

router.get("/", validate(PersonListQuery, "query"), async (req, res, next) => {
  try {
    res.json(await service.listPersons(res.locals.eventId, res.locals.query));
  } catch (err) { next(err); }
});

router.get("/:id", validate(UuidParam, "params"), async (req, res, next) => {
  try {
    res.json(await service.getPerson(res.locals.eventId, res.locals.params.id));
  } catch (err) { next(err); }
});

router.post("/", validate(CreatePersonSchema), async (req, res, next) => {
  try {
    res.status(201).json(await service.createPerson(res.locals.eventId, req.body));
  } catch (err) { next(err); }
});

router.patch("/:id", validate(UuidParam, "params"), validate(UpdatePersonSchema), async (req, res, next) => {
  try {
    res.json(await service.updatePerson(res.locals.eventId, res.locals.params.id, req.body));
  } catch (err) { next(err); }
});

router.delete("/:id", validate(UuidParam, "params"), async (req, res, next) => {
  try {
    await service.deletePerson(res.locals.eventId, res.locals.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
});

export { router as personsRouter };
