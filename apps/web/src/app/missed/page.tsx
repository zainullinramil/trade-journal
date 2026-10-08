"use client";

import { useTranslations } from "next-intl";
import { OptionSelect } from "@/components/ui/option-select";
import { Checkbox } from "@/components/ui/checkbox";

import { Suspense, useState } from "react";
import { FilterBar } from "@/components/filter-bar";
import { Field, fieldClass } from "@/components/filter-fields";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RichEditor, Markdown } from "@/components/rich-editor";
import { Attachments } from "@/components/attachments";
import { ReviewExport } from "@/components/review-export";
import { MonetaryValue, MonetaryField } from "@/components/privacy";
import { useApi, postJson } from "@/lib/use-api";
interface Missed {
  id: string;
  symbol: string;
  direction: string;
  observedAt: string;
  entry: number | null;
  stop: number | null;
  target: number | null;
  playbookId: string | null;
  notes: string;
  archivedAt: string | null;
}
const blank = () => ({
  symbol: "",
  direction: "long",
  observedAt: new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16),
  entry: "",
  stop: "",
  target: "",
  playbookId: "",
  notes: "",
});
export default function MissedPage() {
  return (
    <Suspense>
      <Missed />
    </Suspense>
  );
}
function Missed() {
  const t = useTranslations("missed");
  const tNav = useTranslations("nav");
  const { data, error, refresh } = useApi<{ trades: Missed[] }>("/api/workspace/missed"),
    { data: books } = useApi<{ playbooks: { id: string; name: string }[] }>("/api/playbooks");
  const [open, setOpen] = useState(false),
    [editing, setEditing] = useState<string | null>(null),
    [draft, setDraft] = useState(blank),
    [search, setSearch] = useState(""),
    [archived, setArchived] = useState(false),
    [failure, setFailure] = useState(""),
    [busy, setBusy] = useState(false);
  const directionLabel = (direction: string) =>
    direction === "short" ? t("short") : direction === "long" ? t("long") : direction;
  function edit(trade?: Missed) {
    setEditing(trade?.id ?? null);
    setDraft(
      trade
        ? {
            symbol: trade.symbol,
            direction: trade.direction,
            observedAt: new Date(
              Date.parse(trade.observedAt) - new Date(trade.observedAt).getTimezoneOffset() * 60000,
            )
              .toISOString()
              .slice(0, 16),
            entry: trade.entry?.toString() ?? "",
            stop: trade.stop?.toString() ?? "",
            target: trade.target?.toString() ?? "",
            playbookId: trade.playbookId ?? "",
            notes: trade.notes,
          }
        : blank(),
    );
    setFailure("");
    setOpen(true);
  }
  const rows =
    data?.trades.filter(
      (trade) =>
        Boolean(trade.archivedAt) === archived &&
        `${trade.symbol} ${trade.notes}`.toLowerCase().includes(search.toLowerCase()),
    ) ?? [];
  const formField = (
    key: "symbol" | "observedAt" | "entry" | "stop" | "target",
    label: string,
    type = "text",
  ) => (
    <Field label={label}>
      <MonetaryField sensitive={type === "number"}>
        <input
          className={fieldClass}
          type={type}
          step={type === "number" ? "any" : undefined}
          value={draft[key]}
          onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
        />
      </MonetaryField>
    </Field>
  );
  return (
    <div>
      <FilterBar
        title={tNav("missedTrades")}
        actions={
          <Button size="sm" onClick={() => edit()}>
            {t("logOpportunity")}
          </Button>
        }
      />
      <div className="space-y-4 p-4">
        <p className="text-sm text-muted-foreground">{t("intro")}</p>
        <div className="flex flex-wrap items-center gap-4">
          <input
            aria-label={t("searchAria")}
            className={`${fieldClass} max-w-sm`}
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={archived}
              onCheckedChange={(checked) => setArchived(checked === true)}
            />
            {t("showArchived")}
          </label>
        </div>
        {(error || failure) && (
          <p role="alert" className="text-sm text-destructive">
            {error || failure}
          </p>
        )}
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((trade) => (
            <Card key={trade.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle>
                    {trade.symbol} · {directionLabel(trade.direction)}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => edit(trade)}>
                      {t("edit")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        try {
                          await postJson(
                            "/api/workspace/missed",
                            { id: trade.id, restore: !!trade.archivedAt },
                            "DELETE",
                          );
                          refresh();
                        } catch (e) {
                          setFailure(String(e));
                        }
                      }}
                    >
                      {trade.archivedAt ? t("restore") : t("archive")}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(trade.observedAt).toLocaleString()} ·{" "}
                  {books?.playbooks.find((b) => b.id === trade.playbookId)?.name ?? t("noStrategy")}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-5 text-sm">
                  {[
                    [t("entry"), trade.entry],
                    [t("stop"), trade.stop],
                    [t("target"), trade.target],
                  ].map(([label, value]) => (
                    <span key={String(label)}>
                      <span className="text-muted-foreground">{label}: </span>
                      <MonetaryValue>{value ?? "-"}</MonetaryValue>
                    </span>
                  ))}
                </div>
                <Markdown>{trade.notes || t("noReview")}</Markdown>
                <ReviewExport
                  containsFinancialData
                  document={{
                    title: t("exportTitle", { symbol: trade.symbol }),
                    subtitle: t("exportSubtitle", {
                      direction: directionLabel(trade.direction),
                      when: trade.observedAt,
                    }),
                    lines: [
                      t("exportObservation"),
                      t("exportPlanned", {
                        entry: trade.entry ?? "-",
                        stop: trade.stop ?? "-",
                        target: trade.target ?? "-",
                      }),
                      "",
                      trade.notes,
                    ],
                  }}
                />
                <Attachments type="missed" id={trade.id} />
              </CardContent>
            </Card>
          ))}
        </div>
        {data && !rows.length && (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {archived ? t("emptyArchived") : t("empty")}
          </p>
        )}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editing ? t("editTitle") : t("logTitle")}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {formField("symbol", t("symbol"))}
              <Field label={t("direction")}>
                <OptionSelect
                  className={fieldClass}
                  value={draft.direction}
                  onValueChange={(next) => setDraft({ ...draft, direction: next })}
                >
                  <option value="long">{t("long")}</option>
                  <option value="short">{t("short")}</option>
                </OptionSelect>
              </Field>
              {formField("observedAt", t("observedAt"), "datetime-local")}
              <Field label={t("strategy")}>
                <OptionSelect
                  className={fieldClass}
                  value={draft.playbookId}
                  onValueChange={(next) => setDraft({ ...draft, playbookId: next })}
                >
                  <option value="">{t("noStrategy")}</option>
                  {books?.playbooks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </OptionSelect>
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {formField("entry", t("plannedEntry"), "number")}
              {formField("stop", t("plannedStop"), "number")}
              {formField("target", t("plannedTarget"), "number")}
            </div>
            <RichEditor
              defaultMode="edit"
              value={draft.notes}
              onChange={(notes) => setDraft({ ...draft, notes })}
              placeholder={t("notesPlaceholder")}
            />
            {failure && (
              <p role="alert" className="text-xs text-destructive">
                {failure}
              </p>
            )}
            <Button
              disabled={busy || !draft.symbol.trim() || !draft.observedAt}
              onClick={async () => {
                setBusy(true);
                try {
                  await postJson("/api/workspace/missed", {
                    ...draft,
                    id: editing,
                    observedAt: new Date(draft.observedAt).toISOString(),
                    entry: draft.entry === "" ? null : Number(draft.entry),
                    stop: draft.stop === "" ? null : Number(draft.stop),
                    target: draft.target === "" ? null : Number(draft.target),
                  });
                  setOpen(false);
                  refresh();
                  setFailure("");
                } catch (e) {
                  setFailure(e instanceof Error ? e.message : t("saveFailed"));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t("save")}
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
