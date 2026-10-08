"use client";
import { OptionSelect } from "@/components/ui/option-select";
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslations } from "next-intl";

import type { AnalysisFilters, FilterKey } from "@luxalgo/journal-core";
import { useApi } from "@/lib/use-api";
import { MonetaryField } from "./privacy";
import { ChevronDown, CircleHelp } from "lucide-react";
import { HoverHint } from "./ui/tooltip";
import { DatePicker } from "./ui/date-picker";

export const fieldClass = "h-9 w-full min-w-0 rounded-md border bg-background px-2 text-sm";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("filters");
  return (
    <label className="journal-filter-field grid min-w-0 gap-1 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        {label}
        {hint && (
          <HoverHint heading={label} content={hint}>
            <span
              tabIndex={0}
              aria-label={t("aboutField", { label })}
              className="inline-flex cursor-help rounded-sm text-muted-foreground/70 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <CircleHelp aria-hidden="true" className="h-3 w-3" />
            </span>
          </HoverHint>
        )}
      </span>
      {children}
    </label>
  );
}

export function FilterFields({
  value,
  onChange,
}: {
  value: AnalysisFilters;
  onChange: (v: AnalysisFilters) => void;
}) {
  const t = useTranslations("filters");
  const { data: accounts } = useApi<{
    accounts: { id: string; name: string; archivedAt: string | null }[];
  }>("/api/accounts");
  const { data: playbooks } = useApi<{ playbooks: { id: string; name: string }[] }>(
    "/api/playbooks",
  );
  const set = (key: FilterKey, v: string) => onChange({ ...value, [key]: v });
  const input = (key: FilterKey, label: string, hint?: string, type = "text") => (
    <Field key={key} label={label} hint={hint}>
      <MonetaryField sensitive={/^(entry|exit|pnl)(Min|Max)$/.test(key)}>
        {type === "date" ? (
          <DatePicker
            value={value[key] ?? ""}
            onValueChange={(next) => set(key, next)}
            label={label}
          />
        ) : (
          <input
            className={fieldClass}
            aria-label={label}
            type={type}
            step={type === "number" ? "any" : undefined}
            value={value[key] ?? ""}
            onChange={(e) => set(key, e.target.value)}
          />
        )}
      </MonetaryField>
    </Field>
  );
  const select = (key: FilterKey, label: string, choices: [string, string][], hint?: string) => (
    <Field key={key} label={label} hint={hint}>
      <span className="journal-filter-select relative block min-w-0">
        <OptionSelect
          className={fieldClass}
          value={value[key] ?? ""}
          onValueChange={(next) => set(key, next)}
        >
          <option value="">{t("all")}</option>
          {choices.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </OptionSelect>
      </span>
    </Field>
  );
  const weekdays = [
    t("daySun"),
    t("dayMon"),
    t("dayTue"),
    t("dayWed"),
    t("dayThu"),
    t("dayFri"),
    t("daySat"),
  ];
  return (
    <div className="journal-filter-fields space-y-5">
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-3">
        {input("from", t("from"), t("hintFrom"), "date")}
        {input("to", t("to"), t("hintTo"), "date")}
        {select(
          "playbookId",
          t("strategy"),
          (playbooks?.playbooks ?? []).map((p) => [p.id, p.name]),
          t("hintStrategy"),
        )}
        {input("symbol", t("symbols"), t("hintSymbols"))}
        {input("excludeSymbol", t("excludeSymbols"), t("hintExcludeSymbols"))}
        {input("tag", t("requiredTags"), t("hintTags"))}
        {input("mistake", t("requiredMistakes"), t("hintMistakes"))}
        {select("direction", t("direction"), [
          ["long", t("long")],
          ["short", t("short")],
        ])}
        {select("status", t("outcome"), [
          ["closed", t("allClosed")],
          ["open", t("open")],
          ["win", t("win")],
          ["loss", t("loss")],
          ["breakeven", t("breakeven")],
        ])}
        {select(
          "reviewed",
          t("reviewStatus"),
          [
            ["yes", t("reviewed")],
            ["no", t("unreviewed")],
          ],
          t("hintReview"),
        )}
        {select(
          "assetClass",
          t("assetClass"),
          ["equity", "futures", "forex", "option", "crypto", "cfd", "other"].map((v) => [v, v]),
        )}
      </div>
      <fieldset className="journal-filter-accounts rounded-lg border p-3">
        <legend className="px-1 text-xs text-muted-foreground">{t("accountsLegend")}</legend>
        <div className="flex flex-wrap gap-3">
          {accounts?.accounts
            .filter((a) => !a.archivedAt)
            .map((a) => (
              <label key={a.id} className="journal-filter-choice flex items-center gap-2 text-xs">
                <Checkbox
                  checked={(value.accounts ?? "").split(",").includes(a.id)}
                  onCheckedChange={(checked) => {
                    const ids = new Set((value.accounts ?? "").split(",").filter(Boolean));
                    if (checked === true) ids.add(a.id);
                    else ids.delete(a.id);
                    set("accounts", [...ids].join(","));
                  }}
                />
                {a.name}
              </label>
            ))}
        </div>
      </fieldset>
      <details className="journal-filter-advanced">
        <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm">
          <span>{t("advanced")}</span>
          <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
        </summary>
        <div className="journal-filter-advanced-grid mt-3 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-4">
          {(
            [
              ["quantity", t("quantity")],
              ["entry", t("entryPrice")],
              ["exit", t("exitPrice")],
              ["duration", t("minutesHeld"), t("hintMinutesHeld")],
              ["r", t("realizedR"), t("hintRealizedR")],
              ["plannedR", t("plannedR"), t("hintPlannedR")],
              ["pnl", t("netPnl")],
              ["rating", t("rating")],
            ] as const
          ).flatMap(([k, l, hint]) => [
            input(`${k}Min` as FilterKey, t("min", { label: l }), hint, "number"),
            input(`${k}Max` as FilterKey, t("max", { label: l }), hint, "number"),
          ])}
          {input("entryAfter", t("entryAfter"), undefined, "time")}
          {input("entryBefore", t("entryBefore"), undefined, "time")}
          {input("exitAfter", t("exitAfter"), undefined, "time")}
          {input("exitBefore", t("exitBefore"), undefined, "time")}
        </div>
        <div className="journal-filter-weekdays mt-3 flex flex-wrap gap-2">
          {weekdays.map((day, i) => (
            <label key={day} className="journal-filter-choice flex items-center gap-2 text-xs">
              <Checkbox
                checked={(value.weekdays ?? "").split(",").includes(String(i))}
                onCheckedChange={(checked) => {
                  const days = new Set((value.weekdays ?? "").split(",").filter(Boolean));
                  if (checked === true) days.add(String(i));
                  else days.delete(String(i));
                  set("weekdays", [...days].join(","));
                }}
              />
              {day}
            </label>
          ))}
        </div>
      </details>
    </div>
  );
}
