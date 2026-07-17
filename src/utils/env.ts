import { AppError } from "./AppError.ts";

export const getRequiredEnv = (name: string): string => {
  const value = process.env[name];

  if (!value) {
    throw new AppError(`Missing required environment variable: ${name}`, 500);
  }

  return value;
};

export const getPositiveIntegerEnv = (
  name: string,
  fallback: number,
): number => {
  const rawValue = process.env[name];

  if (!rawValue) {
    return fallback;
  }

  const value = Number(rawValue);

  if (!Number.isInteger(value) || value <= 0) {
    throw new AppError(`${name} must be a positive integer`, 500);
  }

  return value;
};
