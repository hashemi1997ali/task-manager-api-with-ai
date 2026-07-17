import { OpenAIChatCompletionsModel, setTracingDisabled } from "@openai/agents";
import OpenAI from "openai";
import { AppError, getPositiveIntegerEnv, getRequiredEnv } from "#utils";

export type AiProvider = "ollama" | "anthropic";

const providerValue = (process.env.AI_PROVIDER ?? "ollama").toLowerCase();

if (providerValue !== "ollama" && providerValue !== "anthropic") {
  throw new AppError("AI_PROVIDER must be either 'ollama' or 'anthropic'", 500);
}

export const aiProvider: AiProvider = providerValue;
export const aiMaxTurns = getPositiveIntegerEnv("AI_MAX_TURNS", 10);

const requestTimeoutMs = getPositiveIntegerEnv(
  "AI_REQUEST_TIMEOUT_MS",
  120_000,
);

const createOllamaClient = (): { client: OpenAI; modelName: string } => ({
  client: new OpenAI({
    baseURL: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1",
    apiKey: process.env.OLLAMA_API_KEY ?? "ollama",
    timeout: requestTimeoutMs,
    maxRetries: 1,
  }),
  modelName: process.env.OLLAMA_MODEL ?? "qwen3:8b",
});

const createAnthropicClient = (): { client: OpenAI; modelName: string } => ({
  client: new OpenAI({
    baseURL: process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com/v1/",
    apiKey: getRequiredEnv("ANTHROPIC_API_KEY"),
    timeout: requestTimeoutMs,
    maxRetries: 2,
  }),
  modelName: getRequiredEnv("ANTHROPIC_MODEL"),
});

const providerConfig =
  aiProvider === "ollama" ? createOllamaClient() : createAnthropicClient();

// Tracing export is disabled because these runs use non-OpenAI providers.
setTracingDisabled(true);

export const taskAgentModel = new OpenAIChatCompletionsModel(
  providerConfig.client,
  providerConfig.modelName,
);
