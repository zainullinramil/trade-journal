import { eq } from "drizzle-orm";
import { db, settings } from "@/db";
import { decryptJson, encryptJson } from "./crypto";
import { EMPTY_DEFAULTS, type JournalDefaults } from "@/lib/journal-defaults";
import { DEFAULT_CONVERSION, parseCurrencyConversion } from "@/lib/currencies";
import {
  AI_DEFAULT_MODELS,
  AI_ENV_KEYS,
  AI_PROVIDERS,
  LM_STUDIO_DEFAULT_BASE_URL,
  isAiProvider,
  type AiProvider,
  type AiSettingsPayload,
} from "@/lib/ai-settings";

export const getJournalDefaults = (): JournalDefaults => {
  try {
    return { ...EMPTY_DEFAULTS, ...JSON.parse(getSetting("journalDefaults") ?? "{}") };
  } catch {
    return EMPTY_DEFAULTS;
  }
};

export const getSetting = (key: string): string | null =>
  db.select().from(settings).where(eq(settings.key, key)).get()?.value ?? null;

export const setSetting = (key: string, value: string): void => {
  db.insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } })
    .run();
};

export const deleteSetting = (key: string): void => {
  db.delete(settings).where(eq(settings.key, key)).run();
};

export const getCurrencyConversion = () => {
  const saved = getSetting("currencyConversion");
  if (!saved) return DEFAULT_CONVERSION;
  // Invalid saved settings must not silently fall back to a different valuation.
  return parseCurrencyConversion(JSON.parse(saved));
};

/** Journal display timezone (IANA), default UTC. */
export const getTimeZone = (): string => getSetting("timeZone") ?? "UTC";

/** Preserve the legacy parsing default until a separate import zone is saved. */
export const getImportTimeZone = (): string => getSetting("importTimeZone") ?? getTimeZone();

/** Per-symbol contract multipliers for futures/options P&L. */
export const getMultipliers = (): Record<string, number> => {
  const raw = getSetting("multipliers");
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, number>;
  } catch {
    return {};
  }
};

export const aiKeyEnvironment = (provider: AiProvider): string | null =>
  process.env[AI_ENV_KEYS[provider]]?.trim() || null;

export const lmStudioBaseUrlEnvironment = (): string | null =>
  process.env.LM_STUDIO_BASE_URL?.trim() || null;

export const getLmStudioBaseUrl = (): string =>
  lmStudioBaseUrlEnvironment() ||
  getSetting("lmstudioBaseUrl")?.trim() ||
  LM_STUDIO_DEFAULT_BASE_URL;

export const setLmStudioBaseUrl = (value: string | null): void => {
  if (value === null) deleteSetting("lmstudioBaseUrl");
  else setSetting("lmstudioBaseUrl", value.trim());
};

/** Provider keys are stored separately and encrypted like broker credentials. */
export const getAiKey = (provider: AiProvider): string | null => {
  const environment = aiKeyEnvironment(provider);
  if (environment) return environment;
  const envelope = getSetting(`${provider}KeyEnc`);
  if (!envelope) return null;
  try {
    const key = decryptJson<unknown>(envelope);
    return typeof key === "string" ? key.trim() || null : null;
  } catch {
    return null;
  }
};

export const setAiKey = (provider: AiProvider, key: string | null): void => {
  if (key === null) deleteSetting(`${provider}KeyEnc`);
  else setSetting(`${provider}KeyEnc`, encryptJson(key.trim()));
};

const lmStudioConfigured = (): boolean =>
  Boolean(getAiKey("lmstudio")) && Boolean(getLmStudioBaseUrl().trim());

export const isAiProviderConfigured = (provider: AiProvider): boolean =>
  provider === "lmstudio" ? lmStudioConfigured() : Boolean(getAiKey(provider));

export const getAnthropicKey = (): string | null => getAiKey("anthropic");
export const setAnthropicKey = (key: string | null): void => setAiKey("anthropic", key);

export const getAiProvider = (): AiProvider => {
  const selected = getSetting("aiProvider");
  if (isAiProvider(selected)) return selected;
  // Preserve existing Anthropic setups; an OpenAI-only setup works without a UI visit.
  return !getAiKey("anthropic") && getAiKey("openai") ? "openai" : "anthropic";
};

export const aiModelSetting = (provider: AiProvider): string => {
  if (provider === "anthropic") return "aiModel";
  if (provider === "openai") return "openaiModel";
  return `${provider}Model`;
};

export const getAiModel = (provider: AiProvider): string =>
  getSetting(aiModelSetting(provider))?.trim() || AI_DEFAULT_MODELS[provider];

export const getAiSettings = (): AiSettingsPayload => {
  const aiProvider = getAiProvider();
  const connection = (provider: AiProvider) => {
    const key = getAiKey(provider);
    const base: AiSettingsPayload["aiConnections"][AiProvider] = {
      configured: isAiProviderConfigured(provider),
      source: aiKeyEnvironment(provider)
        ? ("environment" as const)
        : key
          ? ("saved" as const)
          : null,
      model: getAiModel(provider),
    };
    if (provider !== "lmstudio") return base;
    const envBase = lmStudioBaseUrlEnvironment();
    const savedBase = getSetting("lmstudioBaseUrl")?.trim();
    return {
      ...base,
      baseUrl: getLmStudioBaseUrl(),
      baseUrlSource: envBase
        ? ("environment" as const)
        : savedBase
          ? ("saved" as const)
          : ("default" as const),
    };
  };
  const aiConnections = Object.fromEntries(
    AI_PROVIDERS.map((id) => [id, connection(id)]),
  ) as AiSettingsPayload["aiConnections"];
  return {
    aiProvider,
    aiConfigured: aiConnections[aiProvider].configured,
    aiModel: aiConnections[aiProvider].model,
    aiConnections,
  };
};
