import type { QueryFilter, SortOrder } from "mongoose";
import mongoose from "mongoose";
import type { RequestHandler } from "express";

import {
  Task,
  type ITask,
  type TaskPriority,
  type TaskStatus,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from "#models";
import {
  deleteAttachmentFromCloudinary,
  uploadAttachment,
} from "#middlewares";
import { AppError } from "#utils";

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const requireUserId = (userId: string | undefined): string => {
  if (!userId) {
    throw new AppError("Authentication required", 401);
  }

  return userId;
};

const validateTaskId = (id: unknown): string => {
  if (typeof id !== "string" || !mongoose.isValidObjectId(id)) {
    throw new AppError("Invalid task ID", 400);
  }

  return id;
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

export const createTask: RequestHandler = async (request, response) => {
  const owner = requireUserId(request.user?.userId);
  const attachment = await createAttachment(request.file);

  try {
    const task = await Task.create({
      ...request.body,
      owner,
      ...(attachment && { attachment }),
      completedAt: request.body.status === "done" ? new Date() : null,
    });

    response.status(201).json({
      success: true,
      message: "Task created successfully",
      data: { task },
    });
  } catch (error) {
    if (attachment) {
      await deleteAttachmentFromCloudinary(
        attachment.publicId,
        attachment.resourceType,
      ).catch(() => undefined);
    }

    throw error;
  }
};

export const getTasks: RequestHandler = async (request, response) => {
  const owner = requireUserId(request.user?.userId);
  const filter: QueryFilter<ITask> = { owner };

  const status = typeof request.query.status === "string"
    ? request.query.status
    : undefined;
  const priority = typeof request.query.priority === "string"
    ? request.query.priority
    : undefined;
  const search = typeof request.query.search === "string"
    ? request.query.search.trim()
    : undefined;
  const dueBefore = typeof request.query.dueBefore === "string"
    ? request.query.dueBefore
    : undefined;
  const dueAfter = typeof request.query.dueAfter === "string"
    ? request.query.dueAfter
    : undefined;

  if (status) {
    if (!TASK_STATUSES.includes(status as (typeof TASK_STATUSES)[number])) {
      throw new AppError("Invalid task status filter", 400);
    }
    filter.status = status as TaskStatus;
  }

  if (priority) {
    if (!TASK_PRIORITIES.includes(priority as (typeof TASK_PRIORITIES)[number])) {
      throw new AppError("Invalid task priority filter", 400);
    }
    filter.priority = priority as TaskPriority;
  }

  if (search) {
    const regex = new RegExp(escapeRegExp(search), "i");
    filter.$or = [{ title: regex }, { description: regex }];
  }

  if (dueBefore || dueAfter) {
    const dueDateFilter: { $lte?: Date; $gte?: Date } = {};

    if (dueBefore) {
      const date = new Date(dueBefore);
      if (Number.isNaN(date.getTime())) {
        throw new AppError("dueBefore must be a valid date", 400);
      }
      dueDateFilter.$lte = date;
    }

    if (dueAfter) {
      const date = new Date(dueAfter);
      if (Number.isNaN(date.getTime())) {
        throw new AppError("dueAfter must be a valid date", 400);
      }
      dueDateFilter.$gte = date;
    }

    filter.dueDate = dueDateFilter;
  }

  const page = Math.max(Number(request.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(request.query.limit) || 10, 1), 100);
  const skip = (page - 1) * limit;

  const allowedSortFields = new Set([
    "createdAt",
    "updatedAt",
    "dueDate",
    "title",
    "status",
  ]);
  const requestedSortBy =
    typeof request.query.sortBy === "string" ? request.query.sortBy : "createdAt";
  const sortBy = allowedSortFields.has(requestedSortBy)
    ? requestedSortBy
    : "createdAt";
  const order: SortOrder = request.query.order === "asc" ? 1 : -1;

  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .sort({ [sortBy]: order, _id: order })
      .skip(skip)
      .limit(limit),
    Task.countDocuments(filter),
  ]);

  response.status(200).json({
    success: true,
    data: {
      tasks,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    },
  });
};

export const getTaskById: RequestHandler = async (request, response) => {
  const owner = requireUserId(request.user?.userId);
  const taskId = validateTaskId(request.params.id);
  const task = await Task.findOne({ _id: taskId, owner });

  if (!task) {
    throw new AppError("Task not found", 404);
  }

  response.status(200).json({ success: true, data: { task } });
};

export const updateTask: RequestHandler = async (request, response) => {
  const owner = requireUserId(request.user?.userId);
  const taskId = validateTaskId(request.params.id);

  if (Object.keys(request.body).length === 0 && !request.file) {
    throw new AppError(
      "At least one task field or an attachment must be provided",
      400,
    );
  }

  const task = await Task.findOne({ _id: taskId, owner });

  if (!task) {
    throw new AppError("Task not found", 404);
  }

  const newAttachment = await createAttachment(request.file);
  const oldAttachment = task.attachment;

  try {
    Object.assign(task, request.body);

    if (request.body.status === "done" && task.status === "done") {
      task.completedAt ??= new Date();
    } else if (request.body.status && request.body.status !== "done") {
      task.completedAt = null;
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

    response.status(200).json({
      success: true,
      message: "Task updated successfully",
      data: { task },
    });
  } catch (error) {
    if (newAttachment) {
      await deleteAttachmentFromCloudinary(
        newAttachment.publicId,
        newAttachment.resourceType,
      ).catch(() => undefined);
    }
    throw error;
  }
};

export const deleteTask: RequestHandler = async (request, response) => {
  const owner = requireUserId(request.user?.userId);
  const taskId = validateTaskId(request.params.id);
  const task = await Task.findOneAndDelete({ _id: taskId, owner });

  if (!task) {
    throw new AppError("Task not found", 404);
  }

  if (task.attachment) {
    await deleteAttachmentFromCloudinary(
      task.attachment.publicId,
      task.attachment.resourceType,
    ).catch(() => undefined);
  }

  response.status(200).json({
    success: true,
    message: "Task deleted successfully",
  });
};

export const deleteTaskAttachment: RequestHandler = async (
  request,
  response,
) => {
  const owner = requireUserId(request.user?.userId);
  const taskId = validateTaskId(request.params.id);
  const task = await Task.findOne({ _id: taskId, owner });

  if (!task) {
    throw new AppError("Task not found", 404);
  }

  if (!task.attachment) {
    throw new AppError("Task does not have an attachment", 404);
  }

  const attachment = task.attachment;
  task.attachment = null;
  await task.save();

  await deleteAttachmentFromCloudinary(
    attachment.publicId,
    attachment.resourceType,
  ).catch(() => undefined);

  response.status(200).json({
    success: true,
    message: "Attachment deleted successfully",
    data: { task },
  });
};

export const getTaskSummary: RequestHandler = async (request, response) => {
  const owner = requireUserId(request.user?.userId);

  const [summary] = await Task.aggregate<{
    total: number;
    todo: number;
    inProgress: number;
    done: number;
    low: number;
    medium: number;
    high: number;
    overdue: number;
  }>([
    { $match: { owner: new mongoose.Types.ObjectId(owner) } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        todo: { $sum: { $cond: [{ $eq: ["$status", "todo"] }, 1, 0] } },
        inProgress: {
          $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] },
        },
        done: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } },
        low: { $sum: { $cond: [{ $eq: ["$priority", "low"] }, 1, 0] } },
        medium: {
          $sum: { $cond: [{ $eq: ["$priority", "medium"] }, 1, 0] },
        },
        high: { $sum: { $cond: [{ $eq: ["$priority", "high"] }, 1, 0] } },
        overdue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ["$status", "done"] },
                  { $ne: ["$dueDate", null] },
                  { $lt: ["$dueDate", new Date()] },
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
  ]);

  response.status(200).json({
    success: true,
    data: {
      summary: summary ?? {
        total: 0,
        todo: 0,
        inProgress: 0,
        done: 0,
        low: 0,
        medium: 0,
        high: 0,
        overdue: 0,
      },
    },
  });
};

export const getAllTasksAdmin: RequestHandler = async (_request, response) => {
  const tasks = await Task.find()
    .populate("owner", "firstName lastName email roles")
    .sort({ createdAt: -1 });

  response.status(200).json({
    success: true,
    data: { tasks, total: tasks.length },
  });
};
