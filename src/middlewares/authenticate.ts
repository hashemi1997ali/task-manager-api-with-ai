import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { AppError, verifyAccessToken } from "#utils";

export const authenticate = (
  request: Request,
  _response: Response,
  next: NextFunction,
): void => {
  const authorization = request.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    next(new AppError("Authentication required", 401));
    return;
  }

  const token = authorization.slice("Bearer ".length).trim();

  if (!token) {
    next(new AppError("Authentication required", 401));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    request.user = { userId: payload.userId, roles: payload.roles };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new AppError("Access token has expired", 401));
      return;
    }

    if (error instanceof jwt.JsonWebTokenError || error instanceof Error) {
      next(new AppError("Invalid access token", 401));
      return;
    }

    next(error);
  }
};
