import type { NextFunction, Request, Response } from "express";

import { AppError } from "#utils";

export const authorize = (...allowedRoles: string[]) =>
  (request: Request, _response: Response, next: NextFunction): void => {
    if (!request.user) {
      next(new AppError("Authentication required", 401));
      return;
    }

    const isAllowed = request.user.roles.some((role) =>
      allowedRoles.includes(role),
    );

    if (!isAllowed) {
      next(new AppError("You do not have permission for this action", 403));
      return;
    }

    next();
  };
