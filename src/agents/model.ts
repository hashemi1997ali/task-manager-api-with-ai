import { OpenAIChatCompletionsModel, setTracingDisabled } from "@openai/agents";
import OpenAI from "openai";
import { AppError, getPositiveIntegerEnv, getRequiredEnv } from "#utils";

export type AiProvider = "ollama" | "anthropic" | "openrouter";

const providerValue = (process.env.AI_PROVIDER ?? "ollama").toLowerCase();

if (
  providerValue !== "ollama" &&
  providerValue !== "anthropic" &&
  providerValue !== "openrouter"
) {
  throw new AppError(
    "AI_PROVIDER must be either 'ollama', 'anthropic', or 'openrouter'",
    500,
  );
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

const createOpenRouterClient = (): { client: OpenAI; modelName: string } => ({
  client: new OpenAI({
    baseURL: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
    apiKey: getRequiredEnv("OPENROUTER_API_KEY"),
    timeout: requestTimeoutMs,
    maxRetries: 2,
  }),
  modelName: process.env.OPENROUTER_MODEL ?? "deepseek/deepseek-chat-v3.1:free",
});

const providerClientFactories: Record<
  AiProvider,
  () => { client: OpenAI; modelName: string }
> = {
  ollama: createOllamaClient,
  anthropic: createAnthropicClient,
  openrouter: createOpenRouterClient,
};

const providerConfig = providerClientFactories[aiProvider]();

// Tracing export is disabled because these runs use non-OpenAI providers.
setTracingDisabled(true);

export const taskAgentModel = new OpenAIChatCompletionsModel(
  providerConfig.client,
  providerConfig.modelName,
);
