"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import type { DayStats } from "@luxalgo/journal-core";
import { calendarTradeHref, type CalendarResponse } from "@/lib/calendar-insights";
import { cn, fmtMoney, fmtPercent } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { HelpHint, HoverHint } from "./ui/tooltip";
import { Pnl } from "./pnl";
import { usePrivacy } from "./privacy";

function DailyChartLoading() {
  const t = useTranslations("calendar");
  return (
    <div
      role="status"
      aria-label={t("loadingDailyChart")}
      className="h-60 rounded-lg bg-muted/20"
    />
  );
}

// Keep the calendar and summaries usable before the plotting bundle loads.
const CalendarDailyChart = dynamic(
  () => import("./charts/calendar-daily-chart").then((module) => module.CalendarDailyChart),
  {
    loading: () => <DailyChartLoading />,
  },
);

function Metric({
  title,
  value,
  detail,
  hint,
}: {
  title: string;
  value: ReactNode;
  detail: ReactNode;
  hint: string;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>{title}</CardTitle>
        <HelpHint heading={title}>{hint}</HelpHint>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
      </CardContent>
    </Card>
  );
}

export function CalendarPerformance({ data, query }: { data: CalendarResponse; query: string }) {
  const t = useTranslations("calendar");
  const tc = useTranslations("charts");
  const locale = useLocale();
  const { insights: i, scope, timeZone, currencies } = data;
  const currency = currencies[0] ?? "USD";
  const mixed = currencies.length > 1;
  const privateMode = usePrivacy();
  const router = useRouter();
  const [weekday, setWeekday] = useState<number | null>(null);
  const href = (date?: string) => calendarTradeHref(query, scope, date);
  const money = (value: number | null) =>
    value === null || mixed ? (
      <span className="text-muted-foreground">—</span>
    ) : (
      <Pnl value={value} currency={currency} />
    );
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
    [locale],
  );
  const weekdayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        weekday: "long",
        timeZone: "UTC",
      }),
    [locale],
  );
  const weekdayShortFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        weekday: "short",
        timeZone: "UTC",
      }),
    [locale],
  );
  const dateLabel = (date: string) => dateFormatter.format(new Date(`${date}T12:00:00Z`));
  // Jan 7 2024 is Sunday UTC — index 0..6 maps to Sun..Sat.
  const weekdayLabel = (index: number) =>
    weekdayFormatter.format(new Date(Date.UTC(2024, 0, 7 + index)));
  const weekdayShort = (index: number) =>
    weekdayShortFormatter.format(new Date(Date.UTC(2024, 0, 7 + index)));
  const selected = weekday === null ? null : i.weekdays[weekday]!;
  const peak = Math.max(1, ...i.weekdays.map((day) => Math.abs(day.netPnl)));
  const dayLink = (day: DayStats | null) =>
    day && !mixed ? (
      <Link
        href={href(day.date)}
        className="inline-flex max-w-full items-center gap-2 rounded text-sm font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
      >
        {money(day.netPnl)}
        <span className="text-xs font-normal text-muted-foreground">{dateLabel(day.date)}</span>
        <ArrowUpRight aria-hidden="true" className="size-3.5 shrink-0" />
      </Link>
    ) : (
      money(null)
    );
  return (
    <section
      aria-labelledby="calendar-insights-heading"
      className="space-y-3"
      data-calendar-insights
    >
      <div className="flex flex-wrap items-end justify-between gap-2 pt-3">
        <div>
          <h2 id="calendar-insights-heading" className="text-base font-semibold tracking-tight">
            {t("insightsTitle")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("insightsMeta", { timeZone })}
          </p>
        </div>
        {i.trades > 0 && (
          <Link
            href={href()}
            className="inline-flex items-center gap-1 rounded text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("viewMatchingTrades")} <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </Link>
        )}
      </div>
      {!i.tradingDays ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <CalendarDays aria-hidden="true" className="mb-1 size-6 text-muted-foreground" />
            <h3 className="text-sm font-medium">{t("noClosedInView")}</h3>
            <p className="max-w-md text-sm text-muted-foreground">{t("noClosedBody")}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {mixed && (
            <p
              role="status"
              className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground"
            >
              {t("mixedCurrencies", { currencies: currencies.join(", ") })}
            </p>
          )}
          <div className="grid gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4">
            <Metric
              title={t("netPnl")}
              value={money(i.netPnl)}
              detail={`${t("tradingDaysDetail", { count: i.tradingDays })}${mixed ? "" : ` · ${currency}`}`}
              hint={t("netPnlHint")}
            />
            <Metric
              title={t("avgDailyPnl")}
              value={money(i.avgDailyPnl)}
              detail={t("perDayWithClosed")}
              hint={t("avgDailyHint")}
            />
            <Metric
              title={t("tradeWinRate")}
              value={fmtPercent(i.winRate)}
              detail={t("winsLossesBe", {
                wins: i.wins,
                losses: i.losses,
                be: i.breakevens,
              })}
              hint={t("winRateHint")}
            />
            <Metric
              title={t("totalClosedTrades")}
              value={
                <Link
                  className="rounded outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                  href={href()}
                >
                  {i.trades}
                </Link>
              }
              detail={t("roundTripHint")}
              hint={t("totalClosedHint")}
            />
          </div>
          {!mixed && (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("bestWorstDay")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="text-xs text-muted-foreground">{t("bestDay")}</span>
                      {dayLink(i.bestDay)}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="text-xs text-muted-foreground">{t("worstDay")}</span>
                      {dayLink(i.worstDay)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {i.tradingDays === 1 ? t("oneTradingDay") : t("highestLowest")}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>{t("avgGreenRed")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-xs text-muted-foreground">
                        {t("profitableDays", { count: i.greenDays })}
                      </span>
                      {money(i.avgGreenDay)}
                    </div>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-xs text-muted-foreground">
                        {t("losingDays", { count: i.redDays })}
                      </span>
                      {money(i.avgRedDay)}
                    </div>
                    <p className="text-xs text-muted-foreground">{t("eachAverageOwn")}</p>
                  </CardContent>
                </Card>
                <Metric
                  title={t("dayConsistency")}
                  value={fmtPercent(i.profitableDayRate)}
                  detail={t("positiveNegativeFlat", {
                    green: i.greenDays,
                    red: i.redDays,
                    flat: i.flatDays,
                  })}
                  hint={t("dayConsistencyHint")}
                />
              </div>
              <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
                <Card>
                  <CardHeader>
                    <h3 className="text-sm font-medium">{t("dailyPerformance")}</h3>
                    <p className="text-xs text-muted-foreground">
                      {t("dailyPerfMeta", { currency })}
                      {i.tradingDays >= 8 ? t("dailyPerfAvg") : ""}
                    </p>
                  </CardHeader>
                  <CardContent>
                    {i.tradingDays >= 2 ? (
                      <CalendarDailyChart
                        data={i.trend}
                        currency={currency}
                        onInspect={(date) => router.push(href(date))}
                      />
                    ) : (
                      <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg bg-muted/30 p-5 text-center">
                        <span className="text-sm font-medium">{t("trendNeedsMore")}</span>
                        <span className="text-xs text-muted-foreground">
                          {dateLabel(i.days[0]!.date)} · {money(i.netPnl)} ·{" "}
                          {t("closedTradesShort", { count: i.trades })}
                        </span>
                        <span className="text-xs text-muted-foreground">{t("exploreEarlier")}</span>
                      </div>
                    )}
                    <details className="mt-3 border-t pt-3">
                      <summary className="cursor-pointer rounded text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
                        {t("dailyValuesLinks", { count: i.tradingDays })}
                      </summary>
                      <div className="mt-2 max-h-60 overflow-auto">
                        <table className="w-full text-left text-xs">
                          <caption className="sr-only">{t("dailyResultsCaption")}</caption>
                          <thead className="sticky top-0 bg-card text-muted-foreground">
                            <tr>
                              <th scope="col" className="py-2 font-medium">
                                {t("closingDay")}
                              </th>
                              <th scope="col" className="text-right font-medium">
                                {tc("trades")}
                              </th>
                              <th scope="col" className="text-right font-medium">
                                {t("netPnl")}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {i.days.map((day) => (
                              <tr key={day.date} className="border-t">
                                <th scope="row" className="py-2 font-normal">
                                  <Link
                                    href={href(day.date)}
                                    className="rounded underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                  >
                                    {dateLabel(day.date)}
                                  </Link>
                                </th>
                                <td className="text-right tabular-nums">{day.trades}</td>
                                <td className="text-right">{money(day.netPnl)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <h3 className="text-sm font-medium">{t("byWeekday")}</h3>
                    <p className="text-xs text-muted-foreground">
                      {t("byWeekdayMeta", { currency })}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-3 rounded-lg bg-muted/40 px-3 py-2">
                      <div className="text-[11px] text-muted-foreground">
                        {t("mostProfitableWeekday")}
                      </div>
                      <div className="mt-0.5 flex flex-wrap justify-between gap-1 text-sm font-medium">
                        {i.mostProfitableWeekday ? (
                          <>
                            <span>{weekdayLabel(i.mostProfitableWeekday.index)}</span>
                            {money(i.mostProfitableWeekday.netPnl)}
                          </>
                        ) : (
                          <span className="text-muted-foreground">{t("noProfitableWeekday")}</span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      {i.weekdays.map((day) => {
                        const label = weekdayLabel(day.index);
                        const pnlText = privateMode
                          ? t("pnlHidden")
                          : fmtMoney(day.netPnl, currency);
                        return (
                          <HoverHint
                            key={day.index}
                            heading={label}
                            content={t("weekdayHover", {
                              days: day.days.length,
                              trades: day.trades,
                              pnl: pnlText,
                            })}
                          >
                            <button
                              type="button"
                              disabled={!day.trades}
                              onClick={() => setWeekday(weekday === day.index ? null : day.index)}
                              aria-pressed={weekday === day.index}
                              aria-label={t("weekdayAria", {
                                label,
                                trades: day.trades,
                                pnl: privateMode ? "" : `, ${fmtMoney(day.netPnl, currency)}`,
                              })}
                              className={cn(
                                "grid w-full grid-cols-[2rem_minmax(0,1fr)_5.75rem] items-center gap-2 rounded-md px-2 py-2 text-left text-xs outline-none hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 disabled:hover:bg-transparent",
                                weekday === day.index && "bg-accent",
                              )}
                            >
                              <span>{weekdayShort(day.index)}</span>
                              <span aria-hidden="true" className="relative h-4">
                                <span className="absolute inset-y-0 left-1/2 w-px bg-border" />
                                <span
                                  className={cn(
                                    "absolute top-1 h-2 rounded-sm",
                                    day.netPnl > 0
                                      ? "bg-profit"
                                      : day.netPnl < 0
                                        ? "bg-loss"
                                        : "bg-muted-foreground",
                                  )}
                                  style={{
                                    left:
                                      day.netPnl < 0
                                        ? `${50 - (Math.abs(day.netPnl) / peak) * 50}%`
                                        : "50%",
                                    width:
                                      day.netPnl === 0
                                        ? "2px"
                                        : `${(Math.abs(day.netPnl) / peak) * 50}%`,
                                  }}
                                />
                              </span>
                              <span className="text-right">
                                {day.trades ? money(day.netPnl) : "—"}
                              </span>
                            </button>
                          </HoverHint>
                        );
                      })}
                    </div>
                    {selected && (
                      <div className="mt-3 border-t pt-3" aria-live="polite">
                        <p className="mb-2 text-xs font-medium">
                          {t("weekdaySelected", {
                            label: weekdayLabel(selected.index),
                            trades: selected.trades,
                            days: selected.days.length,
                          })}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {selected.days.map((day) => (
                            <Link
                              key={day.date}
                              href={href(day.date)}
                              className="rounded-md border px-2 py-1.5 text-xs outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              {dateLabel(day.date)}{" "}
                              <span className="text-muted-foreground">
                                · {t("tradesCount", { count: day.trades })}
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              {i.tradingDays < 5 && (
                <p className="px-1 text-xs text-muted-foreground">
                  {t("smallSample", { count: i.tradingDays })}
                </p>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
