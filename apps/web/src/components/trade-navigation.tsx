"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { useFilters } from "@/components/filter-bar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { tradePath } from "@/lib/trade-links";
import { useApi } from "@/lib/use-api";

interface TradeNavigationData {
  prevKey: string | null;
  nextKey: string | null;
  position: number | null;
  total: number;
}

export function TradeNavigation({ tradeKey }: { tradeKey: string }) {
  const t = useTranslations("tradeDetail.nav");
  const tCommon = useTranslations("common");
  const { query } = useFilters();
  const params = useSearchParams();
  const router = useRouter();
  const scope = params.get("tradeScope") === "account" ? "account" : "all";
  const { data, error, refresh } = useApi<TradeNavigationData>(
    `/api/trades/${encodeURIComponent(tradeKey)}/navigation?${query}&tradeScope=${scope}`,
  );
  const href = (key: string) => `${tradePath(key)}?${params.toString()}`;

  return (
    <nav
      aria-label={t("aria")}
      className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4"
    >
      <Button asChild variant="ghost" size="sm">
        <Link href={`/trades?${query}`}>
          <ArrowLeft /> {t("back")}
        </Link>
      </Button>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={scope}
          onValueChange={(value) => {
            const next = new URLSearchParams(params.toString());
            if (value === "account") next.set("tradeScope", "account");
            else next.delete("tradeScope");
            router.replace(`${tradePath(tradeKey)}?${next}`, { scroll: false });
          }}
        >
          <SelectTrigger aria-label={t("scopeLabel")} className="h-8 w-36 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{query ? t("filtered") : t("all")}</SelectItem>
            <SelectItem value="account">{t("sameAccount")}</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground" aria-live="polite">
          {error ? (
            <button onClick={refresh} className="underline">
              {t("retry")}
            </button>
          ) : data ? (
            data.position === null ? (
              t("outsideFilters")
            ) : (
              t("position", { position: data.position, total: data.total })
            )
          ) : (
            tCommon("loading")
          )}
        </span>
        {data?.prevKey ? (
          <Button asChild variant="outline" size="sm">
            <Link href={href(data.prevKey)} aria-label={t("previousAria")} rel="prev">
              <ChevronLeft /> {t("previous")}
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled aria-label={t("previousAria")}>
            <ChevronLeft /> {t("previous")}
          </Button>
        )}
        {data?.nextKey ? (
          <Button asChild variant="outline" size="sm">
            <Link href={href(data.nextKey)} aria-label={t("nextAria")} rel="next">
              {t("next")} <ChevronRight />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled aria-label={t("nextAria")}>
            {t("next")} <ChevronRight />
          </Button>
        )}
      </div>
    </nav>
  );
}
