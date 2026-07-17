import type { NextFunction, Request, Response } from "express";

export const timeLogger = (
  request: Request,
  response: Response,
  next: NextFunction,
): void => {
  const startedAt = process.hrtime.bigint();

  response.on("finish", () => {
    const durationInMilliseconds =
      Number(process.hrtime.bigint() - startedAt) / 1_000_000;

    console.log(
      `${new Date().toISOString()} ${request.method} ${request.originalUrl} ` +
        `${response.statusCode} ${durationInMilliseconds.toFixed(2)}ms`,
    );
  });

  next();
};
