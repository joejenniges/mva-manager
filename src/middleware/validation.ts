import type { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { AppError } from "./errors.js";
import { ERROR_CODES } from "../constants.js";

type RequestField = "body" | "query" | "params";

export function validate(schema: ZodSchema, field: RequestField = "body") {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req[field]);
      if (field === "body") {
        req.body = parsed;
      } else {
        // WHY: Express 5 makes req.query and req.params read-only getters,
        // so we store Zod-coerced values (e.g. string→number for page/limit)
        // in res.locals. Route handlers read from res.locals.query / res.locals.params.
        res.locals[field] = parsed;
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(new AppError(400, ERROR_CODES.VALIDATION_ERROR, "Validation failed", err.errors));
      } else {
        next(err);
      }
    }
  };
}
