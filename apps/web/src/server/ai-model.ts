import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { OPENROUTER_BASE_URL, type AiProvider } from "@/lib/ai-settings";
import { getAiModel, getLmStudioBaseUrl } from "./settings";

export const languageModel = (
  provider: AiProvider,
  apiKey: string,
  modelId?: string,
): LanguageModel => {
  const model = modelId?.trim() || getAiModel(provider);
  if (provider === "openai") {
    return createOpenAI({ apiKey, baseURL: "https://api.openai.com/v1" }).responses(model);
  }
  if (provider === "anthropic") {
    return createAnthropic({ apiKey, baseURL: "https://api.anthropic.com/v1" })(model);
  }
  if (provider === "openrouter") {
    return createOpenAI({ apiKey, baseURL: OPENROUTER_BASE_URL }).chat(model);
  }
  return createOpenAI({ apiKey, baseURL: getLmStudioBaseUrl() }).chat(model);
};

export const openAiStoreDisabled = (provider: AiProvider): boolean => provider === "openai";
