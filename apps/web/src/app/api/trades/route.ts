import { asc, inArray } from "drizzle-orm";
import { readFilters } from "@luxalgo/journal-core";
import { computeMetrics } from "@luxalgo/journal-core";
import { db, trades } from "@/db";
import { handler, ok } from "@/server/api";
import { getTimeZone } from "@/server/settings";
import { queryTrades, type TradeFilters } from "@/server/trades-query";

const filtersFrom = (url: URL): TradeFilters => readFilters(url.searchParams);

export const GET = handler(async (request: Request) => {
  const url = new URL(request.url);
  const view = url.searchParams.get("view");
  if (view === "symbols") {
    const filters = filtersFrom(url);
    const accountIds = (filters.accounts ?? filters.accountIds?.join(","))
      ?.split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    const rows = db
      .select({ symbol: trades.symbol })
      .from(trades)
      .where(accountIds?.length ? inArray(trades.accountId, accountIds) : undefined)
      .groupBy(trades.symbol)
      .orderBy(asc(trades.symbol))
      .all();
    return ok({ symbols: rows.map((row) => row.symbol) });
  }

  const { rows, trades: tradeList } = queryTrades(filtersFrom(url));
  const timeZone = getTimeZone();
  const metrics = computeMetrics(tradeList, { timeZone });
  const listView = view === "list";
  return ok({
    timeZone,
    trades: rows.map((row, index) => {
      const { notes, exitsJson, executionIdsJson, tagsJson, mistakesJson, ...summary } = row;
      return {
        ...(listView ? summary : row),
        contractMultiplier: tradeList[index]!.contractMultiplier ?? null,
        tags: tradeList[index]!.annotations?.tags ?? [],
        mistakes: tradeList[index]!.annotations?.mistakes ?? [],
        reviewed: row.reviewedAt !== null,
      };
    }),
    metrics,
  });
});
