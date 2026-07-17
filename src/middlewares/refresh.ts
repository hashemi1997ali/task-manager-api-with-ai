import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { AppError, verifyRefreshToken } from "#utils";

export const authenticateRefreshToken = (
  request: Request,
  _response: Response,
  next: NextFunction,
): void => {
  const token = request.cookies?.refreshToken as string | undefined;

  if (!token) {
    next(new AppError("Refresh token is missing", 401));
    return;
  }

  try {
    const payload = verifyRefreshToken(token);
    request.user = { userId: payload.userId, roles: payload.roles };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new AppError("Refresh token has expired", 401));
      return;
    }

    if (error instanceof jwt.JsonWebTokenError || error instanceof Error) {
      next(new AppError("Invalid refresh token", 401));
      return;
    }

    next(error);
  }
};
