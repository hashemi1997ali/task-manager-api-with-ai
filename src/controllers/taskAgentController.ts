import {
  InputGuardrailTripwireTriggered,
  MaxTurnsExceededError,
  run,
} from "@openai/agents";
import type { RequestHandler } from "express";
import {
  aiMaxTurns,
  aiProvider,
  taskTriageAgent,
  type TaskAgentContext,
} from "../agents/index.ts";
import type { TaskAgentPromptInput } from "#schemas";
import { AppError } from "#utils";

const requireUserId = (userId: string | undefined): string => {
  if (!userId) {
    throw new AppError("Authentication required", 401);
  }
  return userId;
};

const getTimeZone = (): string => process.env.AI_TIMEZONE ?? "Europe/Berlin";

/**
 * @openapi
 * /ai/tasks/chat:
 *   post:
 *     tags: [Task AI]
 *     summary: Chat with the task-management agent
 *     description: Routes task-only requests to create, details, update, summary, or guidance agents. An optional attachment is used only for task creation or update.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TaskAgentInput'
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/TaskAgentMultipartInput'
 *     responses:
 *       '200':
 *         description: Agent response.
 *       '400':
 *         description: Off-topic request, invalid input, or unused attachment.
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 */
export const taskAgentChat: RequestHandler = async (request, response) => {
  const ownerId = requireUserId(request.user?.userId);
  const { prompt } = request.body as TaskAgentPromptInput;

  const context: TaskAgentContext = {
    ownerId,
    attachment: request.file,
    attachmentConsumed: false,
    nowIso: new Date().toISOString(),
    timeZone: getTimeZone(),
  };

  try {
    const result = await run(taskTriageAgent, prompt, {
      context,
      maxTurns: aiMaxTurns,
    });

    if (request.file && !context.attachmentConsumed) {
      throw new AppError(
        "An attachment can only be used while creating or updating a task",
        400,
      );
    }

    const output = result.finalOutput;
    if (typeof output !== "string" || output.trim().length === 0) {
      throw new AppError("The task agent returned an empty response", 502);
    }

    response.status(200).json({
      success: true,
      data: {
        provider: aiProvider,
        result: output,
      },
    });
  } catch (error) {
    if (error instanceof InputGuardrailTripwireTriggered) {
      response.status(400).json({
        success: false,
        message:
          "I can only help with tasks: their status, creation, updates, and summaries.",
      });
      return;
    }

    if (error instanceof MaxTurnsExceededError) {
      throw new AppError(
        "The task agent could not finish within the configured turn limit",
        502,
      );
    }

    throw error;
  }
};
