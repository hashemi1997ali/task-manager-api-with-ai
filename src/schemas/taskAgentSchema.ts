import { z } from "zod";

/**
 * @openapi
 * components:
 *   schemas:
 *     TaskAgentInput:
 *       type: object
 *       additionalProperties: false
 *       required: [prompt]
 *       properties:
 *         prompt:
 *           type: string
 *           minLength: 2
 *           maxLength: 4000
 *           example: Create a high-priority task to finish the API docs tomorrow. Expected time is 2 hours.
 *     TaskAgentMultipartInput:
 *       allOf:
 *         - $ref: '#/components/schemas/TaskAgentInput'
 *         - type: object
 *           properties:
 *             attachment:
 *               type: string
 *               format: binary
 */
export const taskAgentPromptSchema = z
  .object({
    prompt: z
      .string()
      .trim()
      .min(2, "Prompt must be at least 2 characters long")
      .max(4000, "Prompt cannot exceed 4000 characters"),
  })
  .strict();

export type TaskAgentPromptInput = z.infer<typeof taskAgentPromptSchema>;
