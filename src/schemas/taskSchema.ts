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
 *         priority:
 *           type: string
 *           enum: [low, medium, high]
 *           default: medium
 *         dueDate:
 *           type: string
 *           format: date-time
 *           example: 2026-07-25T12:00:00+02:00
 *         estimatedMinutes:
 *           type: integer
 *           minimum: 1
 *           maximum: 525600
 *           nullable: true
 *           example: 120
 *     UpdateTaskInput:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         title:
 *           type: string
 *           minLength: 3
 *           maxLength: 100
 *         description:
 *           type: string
 *           maxLength: 2000
 *         status:
 *           type: string
 *           enum: [todo, in-progress, done]
 *         priority:
 *           type: string
 *           enum: [low, medium, high]
 *         dueDate:
 *           anyOf:
 *             - type: string
 *               format: date-time
 *             - type: 'null'
 *         estimatedMinutes:
 *           anyOf:
 *             - type: integer
 *               minimum: 1
 *               maximum: 525600
 *             - type: 'null'
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

const optionalEstimatedMinutesSchema = z.preprocess(
  (value) => (value === "" || value === undefined ? undefined : value),
  z.coerce.number().int().positive().max(525_600).optional(),
);

const nullableOptionalEstimatedMinutesSchema = z.preprocess(
  (value) => (value === "" ? null : value),
  z.union([
    z.coerce.number().int().positive().max(525_600),
    z.null(),
  ]).optional(),
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
    estimatedMinutes: optionalEstimatedMinutesSchema,
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
    estimatedMinutes: nullableOptionalEstimatedMinutesSchema,
  })
  .strict();

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
