import type { CookieOptions, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";

import { getPositiveIntegerEnv, getRequiredEnv } from "./env.ts";

const JWT_ALGORITHM = "HS256" as const;
const objectIdPattern = /^[a-f\d]{24}$/i;

export const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";

export interface AccessTokenPayload extends JwtPayload {
  userId: string;
  roles: string[];
  type: "access";
}

export interface RefreshTokenPayload extends JwtPayload {
  userId: string;
  type: "refresh";
}

const getIssuer = (): string =>
  process.env.JWT_ISSUER ?? "task-manager-api";

export const getAccessTokenTtl = (): number =>
  getPositiveIntegerEnv("ACCESS_TOKEN_TTL", 15 * 60);

export const getRefreshTokenTtl = (): number =>
  getPositiveIntegerEnv("REFRESH_TOKEN_TTL", 7 * 24 * 60 * 60);

const invalidToken = (message: string): jwt.JsonWebTokenError =>
  new jwt.JsonWebTokenError(message);

const isJwtPayload = (
  value: string | JwtPayload,
): value is JwtPayload =>
  typeof value === "object" && value !== null;

export const createAccessToken = (
  userId: string,
  roles: string[],
): string =>
  jwt.sign(
    {
      userId,
      roles,
      type: "access",
    } satisfies AccessTokenPayload,
    getRequiredEnv("ACCESS_JWT_SECRET"),
    {
      algorithm: JWT_ALGORITHM,
      expiresIn: getAccessTokenTtl(),
      issuer: getIssuer(),
      subject: userId,
    },
  );

export const createRefreshToken = (userId: string): string =>
  jwt.sign(
    {
      userId,
      type: "refresh",
    } satisfies RefreshTokenPayload,
    getRequiredEnv("REFRESH_JWT_SECRET"),
    {
      algorithm: JWT_ALGORITHM,
      expiresIn: getRefreshTokenTtl(),
      issuer: getIssuer(),
      subject: userId,
    },
  );

export const verifyAccessToken = (
  token: string,
): AccessTokenPayload => {
  const payload = jwt.verify(
    token,
    getRequiredEnv("ACCESS_JWT_SECRET"),
    {
      algorithms: [JWT_ALGORITHM],
      issuer: getIssuer(),
    },
  );

  if (
    !isJwtPayload(payload) ||
    payload.type !== "access" ||
    typeof payload.userId !== "string" ||
    !objectIdPattern.test(payload.userId) ||
    payload.sub !== payload.userId ||
    typeof payload.exp !== "number" ||
    !Array.isArray(payload.roles) ||
    payload.roles.length === 0 ||
    !payload.roles.every(
      (role) => role === "user" || role === "admin",
    )
  ) {
    throw invalidToken("Invalid access token payload");
  }

  return payload as AccessTokenPayload;
};

export const verifyRefreshToken = (
  token: string,
): RefreshTokenPayload => {
  const payload = jwt.verify(
    token,
    getRequiredEnv("REFRESH_JWT_SECRET"),
    {
      algorithms: [JWT_ALGORITHM],
      issuer: getIssuer(),
    },
  );

  if (
    !isJwtPayload(payload) ||
    payload.type !== "refresh" ||
    typeof payload.userId !== "string" ||
    !objectIdPattern.test(payload.userId) ||
    payload.sub !== payload.userId ||
    typeof payload.exp !== "number"
  ) {
    throw invalidToken("Invalid refresh token payload");
  }

  return payload as RefreshTokenPayload;
};

const getRefreshCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
});

export const setRefreshTokenCookie = (
  response: Response,
  token: string,
): void => {
  response.cookie(REFRESH_TOKEN_COOKIE_NAME, token, {
    ...getRefreshCookieOptions(),
    maxAge: getRefreshTokenTtl() * 1000,
  });
};

export const clearRefreshTokenCookie = (
  response: Response,
): void => {
  response.clearCookie(
    REFRESH_TOKEN_COOKIE_NAME,
    getRefreshCookieOptions(),
  );
};