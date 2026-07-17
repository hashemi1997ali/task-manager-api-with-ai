import { Router } from "express";

import {
  createTask,
  deleteTask,
  deleteTaskAttachment,
  getAllTasksAdmin,
  getTaskById,
  getTaskSummary,
  getTasks,
  updateTask,
} from "#controllers";
import {
  authenticate,
  authorize,
  upload,
  validateByZod,
} from "#middlewares";
import { createTaskSchema, updateTaskSchema } from "#schemas";

export const taskRouter = Router();

taskRouter.use(authenticate);

taskRouter.get("/summary", getTaskSummary);
taskRouter.get("/admin/all", authorize("admin"), getAllTasksAdmin);

taskRouter
  .route("/")
  .get(getTasks)
  .post(
    upload.single("attachment"),
    validateByZod(createTaskSchema),
    createTask,
  );

taskRouter
  .route("/:id")
  .get(getTaskById)
  .patch(
    upload.single("attachment"),
    validateByZod(updateTaskSchema),
    updateTask,
  )
  .delete(deleteTask);

taskRouter.delete("/:id/attachment", deleteTaskAttachment);
