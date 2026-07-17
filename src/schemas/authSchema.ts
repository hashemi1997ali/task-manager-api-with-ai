import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .max(72, "Password cannot exceed 72 characters")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/\d/, "Password must contain a number");

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Please provide a valid email address"));

export const registerSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(2, "First name must be at least 2 characters long")
      .max(50, "First name cannot exceed 50 characters"),
    lastName: z
      .string()
      .trim()
      .min(2, "Last name must be at least 2 characters long")
      .max(50, "Last name cannot exceed 50 characters"),
    email: emailSchema,
    password: passwordSchema,
  })
  .strict();

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1, "Password is required"),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
