import { z } from "zod";

import { TASK_PRIORITIES, TASK_STATUSES } from "#models";

/**
 * @openapi
 * components:
 *   schemas:
 *     CreateTaskInput:
 *       type: object
 *       additionalProperties: false
 *       required: [title]
 *       properties:
 *         title:
 *           type: string
 *           minLength: 3
 *           maxLength: 100
 *           example: Finish API documentation
 *         description:
 *           type: string
 *           maxLength: 2000
 *           example: Add OpenAPI documentation for task routes.
 *         status:
 *           type: string
 *           enum: [todo, in-progress, done]
 *           default: todo
 *           example: todo
 *         priority:
 *           type: string
 *           enum: [low, medium, high]
 *           default: medium
 *           example: high
 *         dueDate:
 *           type: string
 *           format: date-time
 *           example: 2026-07-25T12:00:00+02:00
 *
 *     UpdateTaskInput:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         title:
 *           type: string
 *           minLength: 3
 *           maxLength: 100
 *           example: Complete API documentation
 *         description:
 *           type: string
 *           maxLength: 2000
 *           example: Update the Swagger documentation.
 *         status:
 *           type: string
 *           enum: [todo, in-progress, done]
 *           example: in-progress
 *         priority:
 *           type: string
 *           enum: [low, medium, high]
 *           example: medium
 *         dueDate:
 *           anyOf:
 *             - type: string
 *               format: date-time
 *             - type: 'null'
 *           example: 2026-07-30T12:00:00+02:00
 */

const dateSchema = z.iso
  .datetime({ offset: true })
  .transform((value) => new Date(value));

const optionalDateSchema = z.preprocess(
  (value) => (value === "" || value === undefined ? undefined : value),
  dateSchema.optional(),
);

const nullableOptionalDateSchema = z.preprocess(
  (value) => (value === "" ? null : value),
  z.union([dateSchema, z.null()]).optional(),
);

export const createTaskSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Task title must be at least 3 characters long")
      .max(100, "Task title cannot exceed 100 characters"),

    description: z
      .string()
      .trim()
      .max(2000, "Task description cannot exceed 2000 characters")
      .optional()
      .default(""),

    status: z.enum(TASK_STATUSES).optional().default("todo"),

    priority: z.enum(TASK_PRIORITIES).optional().default("medium"),

    dueDate: optionalDateSchema,
  })
  .strict();

export const updateTaskSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Task title must be at least 3 characters long")
      .max(100, "Task title cannot exceed 100 characters")
      .optional(),

    description: z
      .string()
      .trim()
      .max(2000, "Task description cannot exceed 2000 characters")
      .optional(),

    status: z.enum(TASK_STATUSES).optional(),

    priority: z.enum(TASK_PRIORITIES).optional(),

    dueDate: nullableOptionalDateSchema,
  })
  .strict();

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
