export const AI_PROVIDERS = ["anthropic", "openai", "openrouter", "lmstudio"] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
export const LM_STUDIO_DEFAULT_BASE_URL = "http://127.0.0.1:1234/v1";

export const AI_DEFAULT_MODELS: Record<AiProvider, string> = {
  anthropic: "claude-opus-5",
  openai: "gpt-4.1-mini",
  openrouter: "openai/gpt-4o-mini",
  lmstudio: "local-model",
};

export const AI_PROVIDER_NAMES: Record<AiProvider, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  openrouter: "OpenRouter",
  lmstudio: "LM Studio",
};

export const AI_ENV_KEYS: Record<AiProvider, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  lmstudio: "LM_STUDIO_API_KEY",
};

export const AI_KEY_PLACEHOLDERS: Partial<Record<AiProvider, string>> = {
  anthropic: "sk-ant-…",
  openai: "sk-…",
  openrouter: "sk-or-…",
};

export interface AiConnection {
  configured: boolean;
  source: "environment" | "saved" | null;
  model: string;
  /** LM Studio server URL (non-secret). */
  baseUrl?: string;
  baseUrlSource?: "environment" | "saved" | "default" | null;
}

export interface AiSettingsPayload {
  aiProvider: AiProvider;
  aiConfigured: boolean;
  aiModel: string;
  aiConnections: Record<AiProvider, AiConnection>;
}

export const isAiProvider = (value: unknown): value is AiProvider =>
  typeof value === "string" && (AI_PROVIDERS as readonly string[]).includes(value);

export const normalizeLmStudioBaseUrl = (value: string): string => {
  const trimmed = value.trim().replace(/\/+$/, "");
  return trimmed.endsWith("/v1") ? trimmed : `${trimmed}/v1`;
};

export const isLmStudioBaseUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value.trim());
    return (
      (parsed.protocol === "http:" || parsed.protocol === "https:") && parsed.hostname.length > 0
    );
  } catch {
    return false;
  }
};
