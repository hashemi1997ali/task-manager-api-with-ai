import type { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import multer from "multer";
import mongoose from "mongoose";
import { ZodError } from "zod";
import { AppError } from "#utils";

export const notFound = (
  request: Request,
  _response: Response,
  next: NextFunction,
): void => {
  next(new AppError(`Route not found: ${request.method} ${request.path}`, 404));
};

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _request: Request,
  response: Response,
  next: NextFunction,
): void => {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (typeof error === "object" && error !== null && "type" in error) {
    if (error.type === "entity.parse.failed") {
      response.status(400).json({
        success: false,
        message: "Request body contains malformed JSON",
      });
      return;
    }

    if (error.type === "entity.too.large") {
      response.status(413).json({
        success: false,
        message: "Request body cannot exceed 1 MB",
      });
      return;
    }
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      success: false,
      message: "Validation failed",
      errors: error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  if (error instanceof multer.MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Attachment cannot exceed 5 MB"
        : error.message;

    response.status(400).json({ success: false, message });
    return;
  }

  if (error instanceof mongoose.Error.CastError) {
    response.status(400).json({
      success: false,
      message: `Invalid value for ${error.path}`,
    });
    return;
  }

  if (error instanceof mongoose.Error.ValidationError) {
    response.status(400).json({
      success: false,
      message: "Validation failed",
      errors: Object.values(error.errors).map((issue) => ({
        field: issue.path,
        message: issue.message,
      })),
    });
    return;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  ) {
    response.status(409).json({
      success: false,
      message: "A record with this value already exists",
    });
    return;
  }

  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      console.error(error);
    }

    response.status(error.statusCode).json({
      success: false,
      message: error.message,
      ...(process.env.NODE_ENV !== "production" &&
        error.details !== undefined && { details: error.details }),
    });
    return;
  }

  console.error(error);

  response.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : error instanceof Error
          ? error.message
          : "Unknown server error",
  });
};
