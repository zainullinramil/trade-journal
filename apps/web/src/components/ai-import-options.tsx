"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import * as Popover from "@radix-ui/react-popover";
import { Settings2, X } from "lucide-react";
import { Checkbox } from "./ui/checkbox";
import { HelpHint } from "./ui/tooltip";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { OptionSelect } from "./ui/option-select";
import {
  AI_DEFAULT_MODELS,
  AI_PROVIDER_NAMES,
  AI_PROVIDERS,
  type AiSettingsPayload,
  type AiProvider,
} from "@/lib/ai-settings";
import type { AiImportOptions as Options } from "@/lib/ai-import";

export function AiImportOptions({
  enabled,
  onEnabledChange,
  value,
  onChange,
  settings,
  disabled,
}: {
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
  value: Options;
  onChange: (value: Options) => void;
  settings?: AiSettingsPayload;
  disabled: boolean;
}) {
  const t = useTranslations("import");
  const [open, setOpen] = useState(false);
  const connection = settings?.aiConnections[value.provider];
  const settingsLink = (
    <a href="/settings#ai-settings" className="underline">
      {t("settingsLink")}
    </a>
  );
  return (
    <Popover.Root open={open && enabled} onOpenChange={setOpen}>
      <div className="flex shrink-0 items-center gap-1.5">
        <Checkbox
          id="ai-import-enabled"
          checked={enabled}
          disabled={disabled}
          onCheckedChange={(checked) => {
            onEnabledChange(checked === true);
            setOpen(checked === true);
          }}
        />
        <Label
          htmlFor="ai-import-enabled"
          className="flex cursor-pointer items-center gap-1.5 text-xs font-normal text-muted-foreground"
        >
          {t("parseWithAi")}
        </Label>
        <HelpHint heading={t("aiHelpHeading")}>{t("aiHelp")}</HelpHint>
        {enabled && (
          <Popover.Trigger asChild>
            <button
              type="button"
              disabled={disabled}
              aria-label={t("aiSettingsAria")}
              className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <Settings2 className="size-3.5" />
            </button>
          </Popover.Trigger>
        )}
      </div>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          collisionPadding={12}
          aria-label={t("aiSettingsAria")}
          className="z-50 w-[360px] max-w-[calc(100vw-24px)] max-h-[var(--radix-popover-content-available-height)] overflow-y-auto rounded-xl border bg-popover p-4 text-popover-foreground shadow-xl"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium">{t("aiSettingsTitle")}</span>
            <Popover.Close
              aria-label={t("closeAiSettings")}
              className="rounded-md p-1 text-muted-foreground hover:bg-accent"
            >
              <X className="size-4" />
            </Popover.Close>
          </div>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="import-ai-provider">{t("aiProvider")}</Label>
                <OptionSelect
                  id="import-ai-provider"
                  value={value.provider}
                  disabled={disabled}
                  onValueChange={(provider) => {
                    const next = provider as AiProvider;
                    onChange({
                      provider: next,
                      model: settings?.aiConnections[next].model ?? AI_DEFAULT_MODELS[next],
                      apiKey: "",
                    });
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
                <Label htmlFor="import-ai-model">{t("modelId")}</Label>
                <Input
                  id="import-ai-model"
                  value={value.model}
                  disabled={disabled}
                  onChange={(e) => onChange({ ...value, model: e.target.value })}
                  placeholder={AI_DEFAULT_MODELS[value.provider]}
                />
              </div>
            </div>
            {value.provider === "lmstudio" && (
              <p className="text-xs text-muted-foreground">
                {t("baseUrlLabel")}{" "}
                <span className="font-mono text-[11px]">
                  {settings?.aiConnections.lmstudio.baseUrl ?? t("notSet")}
                </span>
                . {t("baseUrlChangeIn")} {settingsLink}.
              </p>
            )}
            <div className="space-y-1">
              <Label htmlFor="import-ai-key">
                {t("apiKeyLabel", { provider: AI_PROVIDER_NAMES[value.provider] })}
              </Label>
              <Input
                id="import-ai-key"
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={value.apiKey ?? ""}
                disabled={disabled}
                onChange={(e) => onChange({ ...value, apiKey: e.target.value })}
                placeholder={connection?.configured ? t("leaveBlankKey") : t("enterApiKey")}
              />
              <p className="text-xs text-muted-foreground">
                {t("keysSessionOnlyBefore")} {settingsLink}.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("fileSentOnPreview", { provider: AI_PROVIDER_NAMES[value.provider] })}
            </p>
            <p className="text-xs text-muted-foreground">{t("aiLimits")}</p>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
