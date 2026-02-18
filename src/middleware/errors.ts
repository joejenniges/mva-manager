import type { Request, Response, NextFunction } from "express";
import type { ApiError } from "../types.js";
import { ERROR_CODES } from "../constants.js";
import { logger } from "../logger.js";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function notFound(_req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(404, ERROR_CODES.NOT_FOUND, "Resource not found"));
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    const body: ApiError = {
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    };
    res.status(err.statusCode).json(body);
    return;
  }

  logger.error({ err }, "Unhandled error");

  const body: ApiError = {
    error: {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: "Internal server error",
    },
  };
  res.status(500).json(body);
}
