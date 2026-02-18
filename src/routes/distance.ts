import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validation.js";
import { requireAuth } from "../middleware/auth.js";
import { calculateDrivingDistance } from "../services/distance.js";

const router = Router();
router.use(requireAuth);

const DistanceQuery = z.object({
  fromLat: z.string(),
  fromLng: z.string(),
  toLat: z.string(),
  toLng: z.string(),
});

router.get("/", validate(DistanceQuery, "query"), async (req, res, next) => {
  try {
    const { fromLat, fromLng, toLat, toLng } = res.locals.query;
    const result = await calculateDrivingDistance(fromLat, fromLng, toLat, toLng);

    if (!result) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Could not calculate route" } });
      return;
    }

    res.json(result);
  } catch (err) { next(err); }
});

export { router as distanceRouter };
