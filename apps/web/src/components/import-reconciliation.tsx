"use client";

import { useTranslations } from "next-intl";
import type { ImportReview, ImportReviewOptions } from "@/lib/import-review";
import { Button } from "@/components/ui/button";
import { fmtMoney } from "@/lib/utils";

export function ImportReconciliation({
  review,
  options,
  onChange,
  onReview,
  busy,
}: {
  review?: ImportReview;
  options: ImportReviewOptions;
  onChange: (next: ImportReviewOptions) => void;
  onReview: () => void;
  busy: boolean;
}) {
  const t = useTranslations("import");
  return (
    <div className="space-y-3 border-t pt-3">
      <p className="text-sm font-medium">{t("reviewNinjaTitle")}</p>
      <p className="text-xs text-muted-foreground">{t("reviewNinjaHint")}</p>
      {review && (
        <>
          {review.sources.map((source) => (
            <label key={source.key} className="block space-y-1 text-sm">
              <span>{source.label}</span>
              <select
                aria-label={t("sourceMappingAria", { label: source.label })}
                disabled={busy || source.saved}
                className="block w-full rounded-md border bg-background p-2 text-sm"
                value={options.sourceMappings?.[source.key] ?? source.selected ?? ""}
                onChange={(event) =>
                  onChange({
                    ...options,
                    sourceMappings: { ...options.sourceMappings, [source.key]: event.target.value },
                  })
                }
              >
                <option value="">{t("chooseSource")}</option>
                {review.savedSources.map((saved) => (
                  <option key={saved.id} value={saved.id}>
                    {saved.name}
                  </option>
                ))}
                <option value="new">{t("createSeparateSource")}</option>
              </select>
            </label>
          ))}
          <p className="text-xs text-muted-foreground">{t("renameSourceHint")}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm" role="status">
            <span>{t("newFills", { count: review.inserted })}</span>
            <span>{t("duplicateFills", { count: review.duplicates })}</span>
            <span>{t("feeCorrections", { count: review.corrections.length })}</span>
          </div>
          {review.multipliers.map((item) => (
            <p key={item.symbol} className="text-xs">
              {t("multiplierValue", {
                symbol: item.symbol,
                value: item.value ?? t("multiplierMissing"),
              })}
            </p>
          ))}
          {review.multipliers.some((item) => item.value === null) && (
            <a className="text-sm underline" href="/settings" target="_blank" rel="noreferrer">
              {t("openSettingsReview")}
            </a>
          )}
          {review.totals && (
            <div className="rounded-md bg-muted/40 p-3 text-sm">
              <p className="font-medium">
                {t("destinationAfterImport", { currency: review.currency })}
              </p>
              <p>
                {t("closedOpenTrades", {
                  closed: review.totals.closedTrades,
                  open: review.totals.openTrades,
                })}
              </p>
              <p>
                {t("closedNetPnlFees", {
                  pnl: fmtMoney(review.totals.netPnl, review.currency),
                  fees: fmtMoney(review.totals.fees, review.currency),
                })}
              </p>
            </div>
          )}
          {review.needsCompleteHistory && (
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!options.completeHistory}
                disabled={busy}
                onChange={(event) =>
                  onChange({ ...options, completeHistory: event.target.checked })
                }
              />
              <span>{t("completeHistoryConfirm")}</span>
            </label>
          )}
          {!!review.corrections.length && (
            <div className="space-y-2">
              {review.corrections.slice(0, 10).map((correction, index) => (
                <p key={index} className="text-xs">
                  {t("commissionCorrection", {
                    symbol: correction.symbol,
                    executedAt: correction.executedAt,
                    oldFee: fmtMoney(correction.oldFee, review.currency),
                    newFee: fmtMoney(correction.newFee, review.currency),
                  })}
                </p>
              ))}
              {review.corrections.length > 10 && (
                <p className="text-xs">
                  {t("plusMoreCorrections", { count: review.corrections.length - 10 })}
                </p>
              )}
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!options.approveFeeCorrections}
                  disabled={busy}
                  onChange={(event) =>
                    onChange({ ...options, approveFeeCorrections: event.target.checked })
                  }
                />
                <span>{t("approveFeeCorrections")}</span>
              </label>
            </div>
          )}
          {review.warnings.map((message) => (
            <p key={message} className="text-xs text-muted-foreground">
              {message}
            </p>
          ))}
          {review.conflicts.map((message) => (
            <p key={message} role="alert" className="text-xs text-loss">
              {message}
            </p>
          ))}
        </>
      )}
      <Button variant="outline" disabled={busy} onClick={onReview}>
        {busy ? t("reviewing") : t("reviewImport")}
      </Button>
      {review?.token && (
        <p className="text-xs text-muted-foreground">{t("reviewComplete")}</p>
      )}
    </div>
  );
}
