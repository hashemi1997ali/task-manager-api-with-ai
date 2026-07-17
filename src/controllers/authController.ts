import type { RequestHandler, Response } from "express";

import { User } from "#models";
import {
  AppError,
  clearRefreshTokenCookie,
  createAccessToken,
  createRefreshToken,
  setRefreshTokenCookie,
} from "#utils";

const serializeUser = (user: {
  _id: unknown;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: String(user._id),
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  roles: user.roles,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const issueTokens = (
  response: Response,
  userId: string,
  roles: string[],
): string => {
  const accessToken = createAccessToken(userId, roles);
  const refreshToken = createRefreshToken(userId, roles);
  setRefreshTokenCookie(response, refreshToken);
  return accessToken;
};

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a new account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterInput'
 *     responses:
 *       '201':
 *         description: Account created successfully. A refresh token is set as an HTTP-only cookie.
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       '400':
 *         $ref: '#/components/responses/ValidationFailed'
 *       '409':
 *         $ref: '#/components/responses/Conflict'
 */

export const register: RequestHandler = async (request, response) => {
  const { firstName, lastName, email, password } = request.body;

  const emailAlreadyExists = await User.exists({ email });

  if (emailAlreadyExists) {
    throw new AppError("An account with this email already exists", 409);
  }

  const user = await User.create({ firstName, lastName, email, password });
  const accessToken = issueTokens(response, String(user._id), user.roles);

  response.status(201).json({
    success: true,
    message: "Account created successfully",
    data: { user: serializeUser(user), accessToken },
  });
};

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Log in with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginInput'
 *     responses:
 *       '200':
 *         description: Login successful. A refresh token is set as an HTTP-only cookie.
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       '400':
 *         $ref: '#/components/responses/ValidationFailed'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 */

export const login: RequestHandler = async (request, response) => {
  const { email, password } = request.body;

  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError("Invalid email or password", 401);
  }

  const accessToken = issueTokens(response, String(user._id), user.roles);

  response.status(200).json({
    success: true,
    message: "Logged in successfully",
    data: { user: serializeUser(user), accessToken },
  });
};

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Authentication]
 *     summary: Get the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: The authenticated user.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CurrentUserResponse'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '404':
 *         $ref: '#/components/responses/NotFound'
 */

export const getMe: RequestHandler = async (request, response) => {
  const user = await User.findById(request.user?.userId);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  response.status(200).json({
    success: true,
    data: { user: serializeUser(user) },
  });
};

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Authentication]
 *     summary: Refresh the access token
 *     description: Uses the HTTP-only refreshToken cookie and rotates it on success.
 *     security:
 *       - refreshToken: []
 *     responses:
 *       '200':
 *         description: Access token refreshed successfully.
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AccessTokenResponse'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 */

export const refreshAccessToken: RequestHandler = async (
  request,
  response,
) => {
  const user = await User.findById(request.user?.userId);

  if (!user) {
    clearRefreshTokenCookie(response);
    throw new AppError("User no longer exists", 401);
  }

  const accessToken = issueTokens(response, String(user._id), user.roles);

  response.status(200).json({
    success: true,
    message: "Token refreshed successfully",
    data: { accessToken },
  });
};

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Log out and clear the refresh-token cookie
 *     responses:
 *       '200':
 *         description: Logged out successfully.
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 */

export const logout: RequestHandler = (_request, response) => {
  clearRefreshTokenCookie(response);
  response.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};
