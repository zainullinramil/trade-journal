"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AI_DEFAULT_MODELS,
  AI_ENV_KEYS,
  AI_KEY_PLACEHOLDERS,
  AI_PROVIDER_NAMES,
  AI_PROVIDERS,
  LM_STUDIO_DEFAULT_BASE_URL,
  type AiProvider,
  type AiSettingsPayload,
} from "@/lib/ai-settings";
import { postJson, useApi } from "@/lib/use-api";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { OptionSelect } from "./ui/option-select";

export function AiSettings() {
  const t = useTranslations("settingsAi");
  const tCommon = useTranslations("common");
  const { data, error, loading, refresh } = useApi<AiSettingsPayload>("/api/settings");
  const [provider, setProvider] = useState<AiProvider>("anthropic");
  const [model, setModel] = useState(AI_DEFAULT_MODELS.anthropic);
  const [apiKey, setApiKey] = useState("");
  const [lmStudioBaseUrl, setLmStudioBaseUrlState] = useState(LM_STUDIO_DEFAULT_BASE_URL);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const [saved, setSaved] = useState("");

  useEffect(() => {
    if (!data) return;
    setProvider(data.aiProvider);
    setModel(data.aiModel);
    setLmStudioBaseUrlState(
      data.aiConnections.lmstudio.baseUrl ?? LM_STUDIO_DEFAULT_BASE_URL,
    );
  }, [data]);

  const connection = data?.aiConnections[provider];
  const environment = connection?.source === "environment";
  const lmBaseEnv = data?.aiConnections.lmstudio.baseUrlSource === "environment";
  const name = AI_PROVIDER_NAMES[provider];
  const disabled = busy || loading || !data;

  const save = async (remove = false) => {
    setBusy(true);
    setFailure("");
    setSaved("");
    try {
      await postJson(
        "/api/settings",
        remove
          ? {
              [`${provider}Key`]: null,
            }
          : {
              aiProvider: provider,
              aiModel: model.trim(),
              ...(apiKey.trim() ? { [`${provider}Key`]: apiKey.trim() } : {}),
              ...(provider === "lmstudio"
                ? { lmstudioBaseUrl: lmStudioBaseUrl.trim() }
                : {}),
            },
        "PATCH",
      );
      setApiKey("");
      setSaved(remove ? t("keyRemoved", { name }) : t("saved", { name }));
      refresh();
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : t("saveFailed"));
    } finally {
      setBusy(false);
    }
  };

  const keyPlaceholder = connection?.configured
    ? t("keyConfigured")
    : (AI_KEY_PLACEHOLDERS[provider] ?? t("keyPlaceholder"));

  return (
    <Card id="ai-settings" className="scroll-mt-24">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{t("intro")}</p>
        {data && (
          <p className="text-xs text-muted-foreground">
            {t("activeProvider", {
              name: AI_PROVIDER_NAMES[data.aiProvider],
              status: data.aiConfigured ? t("configured") : t("notConfigured"),
            })}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="ai-provider">{t("provider")}</Label>
            <OptionSelect
              id="ai-provider"
              value={provider}
              disabled={disabled}
              onValueChange={(value) => {
                const next = value as AiProvider;
                setProvider(next);
                setModel(data?.aiConnections[next].model ?? AI_DEFAULT_MODELS[next]);
                setApiKey("");
                setSaved("");
                setFailure("");
                if (next === "lmstudio") {
                  setLmStudioBaseUrlState(
                    data?.aiConnections.lmstudio.baseUrl ?? LM_STUDIO_DEFAULT_BASE_URL,
                  );
                }
              }}
            >
              {AI_PROVIDERS.map((id) => (
                <option key={id} value={id}>
                  {AI_PROVIDER_NAMES[id]}
                </option>
              ))}
            </OptionSelect>
          </div>
          <div className="space-y-1">
            <Label htmlFor="ai-model">{t("modelId")}</Label>
            <Input
              id="ai-model"
              value={model}
              disabled={disabled}
              placeholder={AI_DEFAULT_MODELS[provider]}
              onChange={(event) => {
                setModel(event.target.value);
                setSaved("");
              }}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("modelHelp")}
          {provider === "lmstudio" ? t("modelHelpLmStudio") : null}
        </p>
        {provider === "lmstudio" && (
          <div className="space-y-1">
            <Label htmlFor="ai-lmstudio-base-url">{t("lmStudioBaseUrl")}</Label>
            <Input
              id="ai-lmstudio-base-url"
              value={lmStudioBaseUrl}
              disabled={disabled || lmBaseEnv}
              onChange={(event) => {
                setLmStudioBaseUrlState(event.target.value);
                setSaved("");
              }}
              placeholder={LM_STUDIO_DEFAULT_BASE_URL}
              autoComplete="off"
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              {lmBaseEnv ? t("lmStudioBaseEnv") : t("lmStudioBaseHelp")}
            </p>
          </div>
        )}
        <div className="space-y-1">
          <Label htmlFor="ai-api-key">{t("apiKey", { name })}</Label>
          <Input
            id="ai-api-key"
            type="password"
            value={apiKey}
            disabled={disabled || environment}
            onChange={(event) => {
              setApiKey(event.target.value);
              setSaved("");
            }}
            placeholder={keyPlaceholder}
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-xs text-muted-foreground">
            {environment
              ? t("keyEnv", { envKey: AI_ENV_KEYS[provider] })
              : connection?.configured
                ? t("keyKeep")
                : t("keyAdd")}
          </p>
        </div>
        {(error || failure) && (
          <p role="alert" className="text-xs text-destructive">
            {failure || error}
          </p>
        )}
        {saved && (
          <p role="status" className="text-xs text-profit">
            {saved}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={
              disabled ||
              !model.trim() ||
              (provider === "lmstudio" && !lmStudioBaseUrl.trim()) ||
              (!apiKey.trim() && !connection?.configured)
            }
            onClick={() => save()}
          >
            {busy ? tCommon("saving") : t("save")}
          </Button>
          {connection?.source === "saved" && (
            <Button variant="outline" disabled={disabled} onClick={() => save(true)}>
              {t("removeKey", { name })}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
