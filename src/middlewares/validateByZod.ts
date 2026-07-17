import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

export const validateByZod = (schema: ZodType) =>
  (request: Request, _response: Response, next: NextFunction): void => {
    const result = schema.safeParse(request.body);

    if (!result.success) {
      next(result.error);
      return;
    }

    request.body = result.data;
    next();
  };
