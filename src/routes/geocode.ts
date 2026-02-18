import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validation.js";
import { requireAuth } from "../middleware/auth.js";
import { config } from "../config.js";
import { logger } from "../logger.js";

const router = Router();
router.use(requireAuth);

const MAPBOX_BASE = "https://api.mapbox.com/search/searchbox/v1";

const SuggestQuery = z.object({
  q: z.string().min(1),
  session_token: z.string().optional(),
});

// Proxy Mapbox suggest endpoint
router.get("/suggest", validate(SuggestQuery, "query"), async (req, res, next) => {
  try {
    const { q, session_token } = res.locals.query;
    const params = new URLSearchParams({
      q,
      access_token: config.mapboxToken,
      country: "US",
      language: "en",
      limit: "5",
      types: "address",
    });
    if (session_token) params.set("session_token", session_token);

    const response = await fetch(`${MAPBOX_BASE}/suggest?${params}`);
    if (!response.ok) {
      logger.warn({ status: response.status }, "Mapbox suggest failed");
      res.json({ suggestions: [] });
      return;
    }

    const data = await response.json();
    res.json(data);
  } catch (err) { next(err); }
});

const RetrieveParams = z.object({
  id: z.string().min(1),
});

const RetrieveQuery = z.object({
  session_token: z.string().optional(),
});

// Proxy Mapbox retrieve endpoint
router.get("/retrieve/:id", validate(RetrieveParams, "params"), validate(RetrieveQuery, "query"), async (req, res, next) => {
  try {
    const { id } = res.locals.params;
    const { session_token } = res.locals.query;
    const params = new URLSearchParams({
      access_token: config.mapboxToken,
    });
    if (session_token) params.set("session_token", session_token);

    const response = await fetch(`${MAPBOX_BASE}/retrieve/${encodeURIComponent(id)}?${params}`);
    if (!response.ok) {
      logger.warn({ status: response.status }, "Mapbox retrieve failed");
      res.status(response.status).json({ error: "Retrieve failed" });
      return;
    }

    const data = await response.json();
    res.json(data);
  } catch (err) { next(err); }
});

export { router as geocodeRouter };
