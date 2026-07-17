import { tool } from "@openai/agents";
import mongoose, { type HydratedDocument, type QueryFilter } from "mongoose";
import { z } from "zod";
import { Task, TASK_PRIORITIES, TASK_STATUSES, type ITask } from "#models";
import { deleteAttachmentFromCloudinary, uploadAttachment } from "#middlewares";
import { AppError } from "#utils";
import type { TaskAgentContext } from "./taskAgentContext.ts";

const MAX_TASK_MATCHES = 6;
const MAX_SUMMARY_TASKS = 20;

type TaskDocument = HydratedDocument<ITask>;

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const requireContext = (
  context: { context?: unknown } | undefined,
): TaskAgentContext => {
  const value = context?.context as TaskAgentContext | undefined;

  if (!value?.ownerId) {
    throw new AppError(
      "Task agent context is missing an authenticated user",
      500,
    );
  }

  return value;
};

const parseDate = (
  value: string | null | undefined,
  fieldName: string,
): Date | null | undefined => {
  if (value === undefined || value === null) {
    return value;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(`${fieldName} must be a valid ISO 8601 date`, 400);
  }

  return date;
};

const createAttachment = async (file: Express.Multer.File | undefined) => {
  if (!file) {
    return undefined;
  }

  const result = await uploadAttachment(file);

  return {
    url: result.secure_url,
    publicId: result.public_id,
    originalName: file.originalname,
    resourceType: result.resource_type,
  };
};

const serializeTask = (task: TaskDocument) => ({
  id: String(task._id),
  title: task.title,
  description: task.description,
  status: task.status,
  priority: task.priority,
  dueDate: task.dueDate ?? null,
  completedAt: task.completedAt ?? null,
  attachment: task.attachment ?? null,
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
});

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "Unknown task operation error";

interface TaskResolution {
  task?: TaskDocument;
  candidates: ReturnType<typeof serializeTask>[];
}

const resolveOwnedTask = async (
  ownerId: string,
  taskReference: string,
): Promise<TaskResolution> => {
  const reference = taskReference.trim();

  if (mongoose.isValidObjectId(reference)) {
    const task = await Task.findOne({ _id: reference, owner: ownerId });
    return task ? { task, candidates: [] } : { candidates: [] };
  }

  const regex = new RegExp(escapeRegExp(reference), "i");
  const exactTitleRegex = new RegExp(`^${escapeRegExp(reference)}$`, "i");

  const exactMatch = await Task.findOne({
    owner: ownerId,
    title: exactTitleRegex,
  }).sort({ updatedAt: -1 });

  if (exactMatch) {
    return { task: exactMatch, candidates: [] };
  }

  const matches = await Task.find({
    owner: ownerId,
    $or: [{ title: regex }, { description: regex }],
  })
    .sort({ updatedAt: -1 })
    .limit(MAX_TASK_MATCHES);

  if (matches.length === 1 && matches[0]) {
    return { task: matches[0], candidates: [] };
  }

  return { candidates: matches.map(serializeTask) };
};

const createTaskParameters = z.object({
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().max(2000).nullish(),
  status: z.enum(TASK_STATUSES).nullish(),
  priority: z.enum(TASK_PRIORITIES).nullish(),
  dueDate: z
    .string()
    .nullish()
    .describe("ISO 8601 date-time with an offset, or null"),
});

export const createTaskTool = tool({
  name: "create_task",
  description:
    "Create one task for the authenticated user. The request attachment is added automatically when present.",
  parameters: createTaskParameters,
  execute: async (input, runContext) => {
    const context = requireContext(runContext);
    context.attachmentConsumed ||= Boolean(context.attachment);

    let attachment: Awaited<ReturnType<typeof createAttachment>>;

    try {
      attachment = await createAttachment(context.attachment);
      const status = input.status ?? "todo";
      const task = await Task.create({
        owner: context.ownerId,
        title: input.title,
        description: input.description ?? "",
        status,
        priority: input.priority ?? "medium",
        dueDate: parseDate(input.dueDate, "dueDate") ?? null,
        completedAt: status === "done" ? new Date() : null,
        ...(attachment && { attachment }),
      });

      return {
        success: true,
        message: "Task created successfully",
        task: serializeTask(task),
      };
    } catch (error) {
      if (attachment) {
        await deleteAttachmentFromCloudinary(
          attachment.publicId,
          attachment.resourceType,
        ).catch(() => undefined);
      }

      return {
        success: false,
        message: `Task could not be created: ${getErrorMessage(error)}`,
      };
    }
  },
});

const findTaskParameters = z.object({
  taskReference: z
    .string()
    .trim()
    .min(1)
    .describe("A task ID, title, or distinctive words from its description"),
});

export const findTaskTool = tool({
  name: "find_user_task",
  description:
    "Find and return details for a task owned by the authenticated user using its ID, title, or description.",
  parameters: findTaskParameters,
  execute: async ({ taskReference }, runContext) => {
    const context = requireContext(runContext);

    try {
      const resolution = await resolveOwnedTask(context.ownerId, taskReference);

      if (resolution.task) {
        return {
          success: true,
          message: "Task found",
          task: serializeTask(resolution.task),
        };
      }

      if (resolution.candidates.length > 1) {
        return {
          success: false,
          code: "AMBIGUOUS_TASK_REFERENCE",
          message: "More than one task matches that description",
          candidates: resolution.candidates,
        };
      }

      return {
        success: false,
        code: "TASK_NOT_FOUND",
        message: "No task owned by this user matches that description",
      };
    } catch (error) {
      return {
        success: false,
        message: `Task lookup failed: ${getErrorMessage(error)}`,
      };
    }
  },
});

const updateTaskParameters = z.object({
  taskReference: z
    .string()
    .trim()
    .min(1)
    .describe("A task ID, title, or distinctive words from its description"),
  title: z.string().trim().min(3).max(100).nullish(),
  description: z.string().trim().max(2000).nullish(),
  status: z.enum(TASK_STATUSES).nullish(),
  priority: z.enum(TASK_PRIORITIES).nullish(),
  dueDate: z
    .string()
    .nullable()
    .optional()
    .describe("ISO 8601 date-time with an offset, or null to clear it"),
});

export const updateTaskTool = tool({
  name: "update_task",
  description:
    "Update one task owned by the authenticated user. A request attachment replaces the current attachment when present.",
  parameters: updateTaskParameters,
  execute: async (input, runContext) => {
    const context = requireContext(runContext);
    context.attachmentConsumed ||= Boolean(context.attachment);

    let newAttachment: Awaited<ReturnType<typeof createAttachment>>;

    try {
      const resolution = await resolveOwnedTask(
        context.ownerId,
        input.taskReference,
      );

      if (!resolution.task) {
        if (resolution.candidates.length > 1) {
          return {
            success: false,
            code: "AMBIGUOUS_TASK_REFERENCE",
            message:
              "More than one task matches. Ask the user to choose one task before editing.",
            candidates: resolution.candidates,
          };
        }

        return {
          success: false,
          code: "TASK_NOT_FOUND",
          message: "No task owned by this user matches that description",
        };
      }

      const hasFieldUpdate =
        input.title != null ||
        input.description != null ||
        input.status != null ||
        input.priority != null ||
        input.dueDate !== undefined;

      if (!hasFieldUpdate && !context.attachment) {
        return {
          success: false,
          code: "NO_UPDATE_FIELDS",
          message: "No task fields or attachment were provided for the update",
        };
      }

      const task = resolution.task;
      const oldAttachment = task.attachment;
      newAttachment = await createAttachment(context.attachment);

      if (input.title != null) task.title = input.title;
      if (input.description != null) task.description = input.description;
      if (input.priority != null) task.priority = input.priority;
      if (input.dueDate !== undefined) {
        task.dueDate = parseDate(input.dueDate, "dueDate") ?? null;
      }
      if (input.status != null) {
        task.status = input.status;
        if (input.status === "done") {
          task.completedAt ??= new Date();
        } else {
          task.completedAt = null;
        }
      }
      if (newAttachment) {
        task.attachment = newAttachment;
      }

      await task.save();

      if (newAttachment && oldAttachment) {
        await deleteAttachmentFromCloudinary(
          oldAttachment.publicId,
          oldAttachment.resourceType,
        ).catch(() => undefined);
      }

      return {
        success: true,
        message: "Task updated successfully",
        task: serializeTask(task),
      };
    } catch (error) {
      if (newAttachment) {
        await deleteAttachmentFromCloudinary(
          newAttachment.publicId,
          newAttachment.resourceType,
        ).catch(() => undefined);
      }

      return {
        success: false,
        message: `Task could not be updated: ${getErrorMessage(error)}`,
      };
    }
  },
});

const taskSummaryParameters = z.object({
  status: z.enum(TASK_STATUSES).nullish(),
  priority: z.enum(TASK_PRIORITIES).nullish(),
  search: z.string().trim().max(200).nullish(),
  dueBefore: z.string().nullish().describe("ISO 8601 date-time"),
  dueAfter: z.string().nullish().describe("ISO 8601 date-time"),
});

export const summarizeTasksTool = tool({
  name: "summarize_tasks",
  description:
    "Return counts and representative tasks for the authenticated user, optionally filtered by status, priority, text, or due date.",
  parameters: taskSummaryParameters,
  execute: async (input, runContext) => {
    const context = requireContext(runContext);

    try {
      const filter: QueryFilter<ITask> = { owner: context.ownerId };
      const aggregateMatch: Record<string, unknown> = {
        owner: new mongoose.Types.ObjectId(context.ownerId),
      };

      if (input.status) {
        filter.status = input.status;
        aggregateMatch.status = input.status;
      }
      if (input.priority) {
        filter.priority = input.priority;
        aggregateMatch.priority = input.priority;
      }
      if (input.search) {
        const regex = new RegExp(escapeRegExp(input.search), "i");
        const textFilter = [{ title: regex }, { description: regex }];
        filter.$or = textFilter;
        aggregateMatch.$or = textFilter;
      }
      if (input.dueBefore || input.dueAfter) {
        const dueDateFilter: { $lte?: Date; $gte?: Date } = {};
        const dueBefore = parseDate(input.dueBefore, "dueBefore");
        const dueAfter = parseDate(input.dueAfter, "dueAfter");
        if (dueBefore) dueDateFilter.$lte = dueBefore;
        if (dueAfter) dueDateFilter.$gte = dueAfter;
        filter.dueDate = dueDateFilter;
        aggregateMatch.dueDate = dueDateFilter;
      }

      const now = new Date(context.nowIso);
      const [summaryRows, tasks] = await Promise.all([
        Task.aggregate<{
          total: number;
          todo: number;
          inProgress: number;
          done: number;
          low: number;
          medium: number;
          high: number;
          overdue: number;
        }>([
          { $match: aggregateMatch },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              todo: {
                $sum: { $cond: [{ $eq: ["$status", "todo"] }, 1, 0] },
              },
              inProgress: {
                $sum: {
                  $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0],
                },
              },
              done: {
                $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] },
              },
              low: {
                $sum: { $cond: [{ $eq: ["$priority", "low"] }, 1, 0] },
              },
              medium: {
                $sum: {
                  $cond: [{ $eq: ["$priority", "medium"] }, 1, 0],
                },
              },
              high: {
                $sum: { $cond: [{ $eq: ["$priority", "high"] }, 1, 0] },
              },
              overdue: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ["$status", "done"] },
                        { $ne: ["$dueDate", null] },
                        { $lt: ["$dueDate", now] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
          { $project: { _id: 0 } },
        ]),
        Task.find(filter)
          .sort({ status: 1, dueDate: 1, updatedAt: -1 })
          .limit(MAX_SUMMARY_TASKS),
      ]);

      const counts = summaryRows[0] ?? {
        total: 0,
        todo: 0,
        inProgress: 0,
        done: 0,
        low: 0,
        medium: 0,
        high: 0,
        overdue: 0,
      };

      return {
        success: true,
        filters: {
          status: input.status ?? null,
          priority: input.priority ?? null,
          search: input.search ?? null,
          dueBefore: input.dueBefore ?? null,
          dueAfter: input.dueAfter ?? null,
        },
        counts,
        tasks: tasks.map(serializeTask),
        truncated: counts.total > tasks.length,
      };
    } catch (error) {
      return {
        success: false,
        message: `Task summary failed: ${getErrorMessage(error)}`,
      };
    }
  },
});
