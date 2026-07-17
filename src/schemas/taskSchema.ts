import { z } from "zod";

import { TASK_PRIORITIES, TASK_STATUSES } from "#models";

/**
 * @openapi
 * components:
 *   schemas:
 *     TaskAttachment:
 *       type: object
 *       required: [url, publicId, originalName, resourceType]
 *       properties:
 *         url:
 *           type: string
 *           format: uri
 *         publicId:
 *           type: string
 *         originalName:
 *           type: string
 *         resourceType:
 *           type: string
 *     TaskOwner:
 *       type: object
 *       required: [_id, firstName, lastName, email, roles]
 *       properties:
 *         _id:
 *           type: string
 *           pattern: '^[a-fA-F0-9]{24}$'
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         roles:
 *           type: array
 *           items:
 *             type: string
 *             enum: [user, admin]
 *     Task:
 *       type: object
 *       required: [_id, title, description, status, priority, owner, createdAt, updatedAt]
 *       properties:
 *         _id:
 *           type: string
 *           pattern: '^[a-fA-F0-9]{24}$'
 *           example: 507f1f77bcf86cd799439012
 *         title:
 *           type: string
 *           minLength: 3
 *           maxLength: 100
 *           example: Finish API documentation
 *         description:
 *           type: string
 *           maxLength: 2000
 *           example: Add OpenAPI schemas and operations.
 *         status:
 *           type: string
 *           enum: [todo, in-progress, done]
 *           example: todo
 *         priority:
 *           type: string
 *           enum: [low, medium, high]
 *           example: high
 *         dueDate:
 *           anyOf:
 *             - type: string
 *               format: date-time
 *             - type: 'null'
 *         completedAt:
 *           anyOf:
 *             - type: string
 *               format: date-time
 *             - type: 'null'
 *         attachment:
 *           anyOf:
 *             - $ref: '#/components/schemas/TaskAttachment'
 *             - type: 'null'
 *         owner:
 *           oneOf:
 *             - type: string
 *               pattern: '^[a-fA-F0-9]{24}$'
 *             - $ref: '#/components/schemas/TaskOwner'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     TaskBase:
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
 *           type: string
 *           format: date-time
 *     CreateTaskInput:
 *       allOf:
 *         - $ref: '#/components/schemas/TaskBase'
 *         - type: object
 *           required: [title]
 *     CreateTaskMultipartInput:
 *       allOf:
 *         - $ref: '#/components/schemas/TaskBase'
 *         - type: object
 *           required: [title]
 *           properties:
 *             attachment:
 *               type: string
 *               format: binary
 *               description: One JPG, PNG, WEBP, PDF or TXT file, up to 5 MB.
 *     UpdateTaskInput:
 *       type: object
 *       additionalProperties: false
 *       minProperties: 1
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
 *     UpdateTaskMultipartInput:
 *       allOf:
 *         - $ref: '#/components/schemas/UpdateTaskInput'
 *         - type: object
 *           properties:
 *             attachment:
 *               type: string
 *               format: binary
 *               description: One JPG, PNG, WEBP, PDF or TXT file, up to 5 MB.
 *     Pagination:
 *       type: object
 *       required: [total, page, limit, totalPages, hasNextPage, hasPreviousPage]
 *       properties:
 *         total:
 *           type: integer
 *           minimum: 0
 *         page:
 *           type: integer
 *           minimum: 1
 *         limit:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         totalPages:
 *           type: integer
 *           minimum: 0
 *         hasNextPage:
 *           type: boolean
 *         hasPreviousPage:
 *           type: boolean
 *     TaskSummary:
 *       type: object
 *       required: [total, todo, inProgress, done, low, medium, high, overdue]
 *       properties:
 *         total:
 *           type: integer
 *           minimum: 0
 *         todo:
 *           type: integer
 *           minimum: 0
 *         inProgress:
 *           type: integer
 *           minimum: 0
 *         done:
 *           type: integer
 *           minimum: 0
 *         low:
 *           type: integer
 *           minimum: 0
 *         medium:
 *           type: integer
 *           minimum: 0
 *         high:
 *           type: integer
 *           minimum: 0
 *         overdue:
 *           type: integer
 *           minimum: 0
 *     TaskResponse:
 *       type: object
 *       required: [success, data]
 *       properties:
 *         success:
 *           type: boolean
 *           const: true
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           required: [task]
 *           properties:
 *             task:
 *               $ref: '#/components/schemas/Task'
 *     TaskListResponse:
 *       type: object
 *       required: [success, data]
 *       properties:
 *         success:
 *           type: boolean
 *           const: true
 *         data:
 *           type: object
 *           required: [tasks, pagination]
 *           properties:
 *             tasks:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Task'
 *             pagination:
 *               $ref: '#/components/schemas/Pagination'
 *     TaskSummaryResponse:
 *       type: object
 *       required: [success, data]
 *       properties:
 *         success:
 *           type: boolean
 *           const: true
 *         data:
 *           type: object
 *           required: [summary]
 *           properties:
 *             summary:
 *               $ref: '#/components/schemas/TaskSummary'
 *     AdminTaskListResponse:
 *       type: object
 *       required: [success, data]
 *       properties:
 *         success:
 *           type: boolean
 *           const: true
 *         data:
 *           type: object
 *           required: [tasks, total]
 *           properties:
 *             tasks:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Task'
 *             total:
 *               type: integer
 *               minimum: 0
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
