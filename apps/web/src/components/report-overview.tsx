"use client";

import { useTranslations } from "next-intl";
import type { AnalysisFilters, BucketStats } from "@luxalgo/journal-core";
import { TimeHeatmap } from "./charts/time-heatmap";
import { ReviewExport } from "./review-export";
import { MonetaryValue } from "./privacy";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { useApi } from "@/lib/use-api";
import { fmtMoney, fmtPercent, pnlClass } from "@/lib/utils";
import { describeFilters } from "@/lib/filter-description";

interface OverviewData {
  buckets: Record<
    "symbol" | "tag" | "mistake" | "playbook" | "weekday" | "hour" | "duration" | "direction",
    BucketStats[]
  >;
  currencies: string[];
  timeZone: string;
  accounts: { id: string; name: string }[];
  playbooks: { id: string; name: string }[];
}

const SECTION_KEYS = [
  "symbol",
  "direction",
  "weekday",
  "duration",
  "tag",
  "mistake",
  "playbook",
] as const;

export function ReportOverview({ query, filters }: { query: string; filters: AnalysisFilters }) {
  const t = useTranslations("reports");
  const { data, error, loading } = useApi<OverviewData>(`/api/stats?${query}`);
  const sections = SECTION_KEYS.map((key) => ({
    key,
    title: t(
      (
        {
          symbol: "bySymbol",
          direction: "longVsShort",
          weekday: "byWeekday",
          duration: "byHoldingTime",
          tag: "byTag",
          mistake: "byMistake",
          playbook: "byPlaybook",
        } as const
      )[key],
    ),
    head: t(
      (
        {
          symbol: "sectionSymbol",
          direction: "sectionDirection",
          weekday: "sectionWeekday",
          duration: "sectionDuration",
          tag: "sectionTag",
          mistake: "sectionMistake",
          playbook: "sectionPlaybook",
        } as const
      )[key],
    ),
  }));
  if (error)
    return (
      <p role="alert" className="text-sm text-destructive">
        {error}
      </p>
    );
  if (loading || !data) return <Skeleton className="h-72" />;
  if (data.currencies.length > 1)
    return (
      <p className="rounded-lg border p-4 text-sm">
        {t("multiCurrency", { currencies: data.currencies.join(", ") })}
      </p>
    );
  const currency = data.currencies[0] ?? "USD";
  const label = (dimension: string, key: string) =>
    dimension === "playbook" ? (data.playbooks.find((book) => book.id === key)?.name ?? key) : key;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {t("overviewMeta", { timeZone: data.timeZone, currency })}
        </p>
        <ReviewExport
          containsFinancialData
          document={{
            title: t("overviewTitle"),
            subtitle: `${data.timeZone} · ${currency}`,
            lines: [
              t("exportFilters", {
                filters: describeFilters(filters, data.accounts, data.playbooks),
              }),
              "",
              t("overviewHourSection"),
              ...data.buckets.hour.map((b) =>
                t("overviewHourLine", {
                  hour: b.key,
                  trades: b.trades,
                  pnl: fmtMoney(b.netPnl, currency),
                }),
              ),
              ...sections.flatMap((section) => [
                "",
                section.title,
                ...data.buckets[section.key].map((b) =>
                  t("overviewBucketLine", {
                    label: label(section.key, b.key),
                    trades: b.trades,
                    winRate: fmtPercent(b.winRate, 0),
                    pnl: fmtMoney(b.netPnl, currency),
                  }),
                ),
              ]),
            ],
          }}
        />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("tradeTimePerformance")}</CardTitle>
          </CardHeader>
          <CardContent>
            <TimeHeatmap hours={data.buckets.hour} currency={currency} />
          </CardContent>
        </Card>
        {sections.map((section) => (
          <Card key={section.key}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {data.buckets[section.key].length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {section.key === "tag" || section.key === "mistake" || section.key === "playbook"
                    ? t("annotateToUnlock")
                    : t("noDataYet")}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{section.head}</TableHead>
                      <TableHead className="text-right">{t("trades")}</TableHead>
                      <TableHead className="text-right">{t("winPercent")}</TableHead>
                      <TableHead className="text-right">{t("netPnl")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.buckets[section.key].map((bucket) => (
                      <TableRow key={bucket.key}>
                        <TableCell className="font-medium">
                          {label(section.key, bucket.key)}
                        </TableCell>
                        <TableCell className="tnum text-right text-muted-foreground">
                          {bucket.trades}
                        </TableCell>
                        <TableCell className="tnum text-right">
                          {fmtPercent(bucket.winRate, 0)}
                        </TableCell>
                        <TableCell className={`tnum text-right ${pnlClass(bucket.netPnl)}`}>
                          <MonetaryValue>{fmtMoney(bucket.netPnl, currency)}</MonetaryValue>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{t("overviewFootnote")}</p>
    </div>
  );
}
