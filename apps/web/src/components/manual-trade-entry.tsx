"use client";

import { useId, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { MonetaryField } from "@/components/privacy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { postJson, useApi } from "@/lib/use-api";

import { AccountPicker } from "./account-picker";
import { fmtNumber } from "@/lib/utils";

interface ManualLeg {
  datetime: string;
  side: "buy" | "sell";
  quantity: string;
  price: string;
  fee: string;
}

function accountFromParams(params: URLSearchParams): string {
  const selected = params.get("accounts")?.split(",").filter(Boolean) ?? [];
  return selected.length === 1 ? selected[0]! : "";
}

const decimal = (value: string) => value.replaceAll(",", ".");

export function ManualTradeEntry({ onSaved }: { onSaved: () => void }) {
  const t = useTranslations("import");
  const tCommon = useTranslations("common");
  const params = useSearchParams();
  const [accountId, setAccountId] = useState(() => accountFromParams(params));
  const [symbol, setSymbol] = useState("");
  const [notes, setNotes] = useState("");
  const [legs, setLegs] = useState<ManualLeg[]>([
    { datetime: "", side: "buy", quantity: "", price: "", fee: "" },
    { datetime: "", side: "sell", quantity: "", price: "", fee: "" },
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fieldId = useId();
  const symbolsUrl = accountId
    ? `/api/trades?view=symbols&accounts=${encodeURIComponent(accountId)}`
    : "/api/trades?view=symbols";
  const { data: symbolsData } = useApi<{ symbols: string[] }>(symbolsUrl);

  const setLeg = (index: number, patch: Partial<ManualLeg>) =>
    setLegs((current) => current.map((leg, i) => (i === index ? { ...leg, ...patch } : leg)));

  const valid =
    accountId &&
    symbol &&
    legs.some((leg) => leg.datetime && Number(leg.quantity) > 0 && leg.price !== "");

  const save = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setError("");
    try {
      await postJson("/api/executions", {
        accountId,
        ...(notes.trim() ? { notes } : {}),
        executions: legs
          .filter((leg) => leg.datetime && Number(leg.quantity) > 0 && leg.price !== "")
          .map((leg) => ({
            symbol,
            side: leg.side,
            quantity: Number(leg.quantity),
            price: Number(leg.price),
            fee: leg.fee === "" ? 0 : Number(leg.fee),
            executedAt: new Date(leg.datetime).toISOString(),
          })),
      });
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("saveFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <fieldset disabled={busy} className="min-w-0 space-y-3">
      <AccountPicker value={accountId} onChange={setAccountId} kind="manual" />
      <div>
        <Label htmlFor={`${fieldId}-symbol`} className="mb-1 block text-xs text-muted-foreground">
          {t("symbol")}
        </Label>
        <Input
          id={`${fieldId}-symbol`}
          list={`${fieldId}-symbols`}
          value={symbol}
          onChange={(event) => setSymbol(event.target.value.toUpperCase())}
          placeholder={t("manualSymbolPlaceholder")}
          autoComplete="off"
        />
        <datalist id={`${fieldId}-symbols`}>
          {(symbolsData?.symbols ?? []).map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
      </div>
      <div className="manual-executions space-y-3">
        {legs.map((leg, index) => (
          <fieldset
            key={index}
            className="manual-execution-row grid min-w-0 gap-2 rounded-lg border p-3"
          >
            <legend className="px-1 text-xs text-muted-foreground">
              {t("executionN", { n: index + 1 })}
            </legend>
            <label className="manual-execution-date grid min-w-0 gap-1 text-xs text-muted-foreground">
              {t("dateTime")}
              <Input
                type="datetime-local"
                value={leg.datetime}
                onChange={(event) => setLeg(index, { datetime: event.target.value })}
              />
            </label>
            <div className="grid min-w-0 gap-1 text-xs text-muted-foreground">
              <span id={`${fieldId}-execution-side-${index}`}>{t("side")}</span>
              <Select
                value={leg.side}
                onValueChange={(value) => setLeg(index, { side: value as "buy" | "sell" })}
              >
                <SelectTrigger aria-labelledby={`${fieldId}-execution-side-${index}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buy">{t("buy")}</SelectItem>
                  <SelectItem value="sell">{t("sell")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="grid min-w-0 gap-1 text-xs text-muted-foreground">
              {t("quantity")}
              <Input
                placeholder={t("qtyPlaceholder")}
                inputMode="decimal"
                value={leg.quantity}
                onChange={(event) => setLeg(index, { quantity: decimal(event.target.value) })}
              />
            </label>
            <label className="grid min-w-0 gap-1 text-xs text-muted-foreground">
              {t("price")}
              <MonetaryField>
                <Input
                  placeholder={t("pricePlaceholder")}
                  inputMode="decimal"
                  value={leg.price}
                  onChange={(event) => setLeg(index, { price: decimal(event.target.value) })}
                />
              </MonetaryField>
            </label>
            <label className="grid min-w-0 gap-1 text-xs text-muted-foreground">
              {t("fee")}
              <MonetaryField>
                <Input
                  placeholder={t("feePlaceholder")}
                  inputMode="decimal"
                  value={leg.fee}
                  onChange={(event) => setLeg(index, { fee: decimal(event.target.value) })}
                />
              </MonetaryField>
            </label>
          </fieldset>
        ))}
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${fieldId}-notes`}>{t("notesOptional")}</Label>
        <textarea
          id={`${fieldId}-notes`}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          maxLength={100000}
          rows={4}
          placeholder={t("notesPlaceholder")}
          className="flex w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
        />
        <p className="text-xs text-muted-foreground">{t("notesHint")}</p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setLegs((current) => [
              ...current,
              { datetime: "", side: "sell", quantity: "", price: "", fee: "" },
            ])
          }
        >
          {t("addExecution")}
        </Button>
        <Button size="sm" onClick={save} disabled={!valid || busy}>
          {busy ? tCommon("saving") : t("saveTrade")}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {t("manualFootnote", {
          symbol: symbol || t("theSymbol"),
          legs: fmtNumber(legs.filter((leg) => leg.datetime).length, 0),
        })}
      </p>
    </fieldset>
  );
}
