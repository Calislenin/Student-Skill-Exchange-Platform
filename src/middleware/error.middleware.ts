import type { ErrorRequestHandler, RequestHandler } from "express";
import multer from "multer";
import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";

export const notFound: RequestHandler = (req, _res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "The PDF must be 10 MB or smaller"
        : "The uploaded file could not be accepted";
    res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({
      success: false,
      message,
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    });
    return;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  ) {
    res.status(409).json({ success: false, message: "That value is already in use" });
    return;
  }

  console.error(error);
  res.status(500).json({
    success: false,
    message: "Something went wrong on the server",
    ...(env.NODE_ENV === "development" && error instanceof Error
      ? { error: error.message }
      : {}),
  });
};
