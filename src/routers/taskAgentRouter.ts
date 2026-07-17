import { Router } from "express";
import { taskAgentChat } from "#controllers";
import { authenticate, upload, validateByZod } from "#middlewares";
import { taskAgentPromptSchema } from "#schemas";

export const taskAgentRouter = Router();

taskAgentRouter.use(authenticate);

taskAgentRouter.post(
  "/chat",
  upload.single("attachment"),
  validateByZod(taskAgentPromptSchema),
  taskAgentChat,
);
