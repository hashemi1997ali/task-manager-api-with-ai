import type { Response } from "express";
import jwt from "jsonwebtoken";

import { getPositiveIntegerEnv, getRequiredEnv } from "./env.ts";

export interface TokenPayload {
  userId: string;
  roles: string[];
  type: "access" | "refresh";
}

const getIssuer = (): string => process.env.JWT_ISSUER ?? "task-manager-api";

export const getAccessTokenTtl = (): number =>
  getPositiveIntegerEnv("ACCESS_TOKEN_TTL", 15 * 60);

export const getRefreshTokenTtl = (): number =>
  getPositiveIntegerEnv("REFRESH_TOKEN_TTL", 7 * 24 * 60 * 60);

export const createAccessToken = (userId: string, roles: string[]): string =>
  jwt.sign(
    { userId, roles, type: "access" } satisfies TokenPayload,
    getRequiredEnv("ACCESS_JWT_SECRET"),
    {
      expiresIn: getAccessTokenTtl(),
      issuer: getIssuer(),
      subject: userId,
    },
  );

export const createRefreshToken = (userId: string, roles: string[]): string =>
  jwt.sign(
    { userId, roles, type: "refresh" } satisfies TokenPayload,
    getRequiredEnv("REFRESH_JWT_SECRET"),
    {
      expiresIn: getRefreshTokenTtl(),
      issuer: getIssuer(),
      subject: userId,
    },
  );

export const verifyAccessToken = (token: string): TokenPayload => {
  const payload = jwt.verify(token, getRequiredEnv("ACCESS_JWT_SECRET"), {
    issuer: getIssuer(),
  }) as TokenPayload;

  if (payload.type !== "access") {
    throw new Error("Invalid access token type");
  }

  return payload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  const payload = jwt.verify(token, getRequiredEnv("REFRESH_JWT_SECRET"), {
    issuer: getIssuer(),
  }) as TokenPayload;

  if (payload.type !== "refresh") {
    throw new Error("Invalid refresh token type");
  }

  return payload;
};

export const setRefreshTokenCookie = (
  response: Response,
  token: string,
): void => {
  response.cookie("refreshToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: getRefreshTokenTtl() * 1000,
    path: "/",
  });
};

export const clearRefreshTokenCookie = (response: Response): void => {
  response.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
};
