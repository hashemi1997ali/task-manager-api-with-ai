import { Router } from "express";

import {
  getMe,
  login,
  logout,
  refreshAccessToken,
  register,
} from "#controllers";
import {
  authenticate,
  authenticateRefreshToken,
  validateByZod,
} from "#middlewares";
import { loginSchema, registerSchema } from "#schemas";

export const authRouter = Router();

authRouter.post("/register", validateByZod(registerSchema), register);
authRouter.post("/login", validateByZod(loginSchema), login);
authRouter.post("/refresh", authenticateRefreshToken, refreshAccessToken);
authRouter.post("/logout", logout);
authRouter.get("/me", authenticate, getMe);
