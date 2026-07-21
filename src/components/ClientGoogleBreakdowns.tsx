"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { TableSkeleton } from "@/components/ui/Skeleton";
import { formatBRL, formatNumber, formatPercent } from "@/lib/format";
import { SortableTh, useTableSort } from "@/components/campaigns/googleTableSort";
import { GoogleDateRangePicker, lastNDaysRange } from "@/components/GoogleDateRangePicker";

type BreakdownRow = {
  label: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  ctr: number;
  averageCpc: number;
};

type Dimension = "device" | "gender" | "age" | "search_term" | "keyword";
const DIMENSIONS: Dimension[] = ["device", "gender", "age", "search_term", "keyword"];

const DEVICE_LABELS: Record<string, { pt: string; en: string }> = {
  MOBILE: { pt: "Celular", en: "Mobile" },
  DESKTOP: { pt: "Desktop", en: "Desktop" },
  TABLET: { pt: "Tablet", en: "Tablet" },
  CONNECTED_TV: { pt: "TV conectada", en: "Connected TV" },
  OTHER: { pt: "Outro", en: "Other" }
};
const GENDER_LABELS: Record<string, { pt: string; en: string }> = {
  MALE: { pt: "Masculino", en: "Male" },
  FEMALE: { pt: "Feminino", en: "Female" },
  UNDETERMINED: { pt: "Não determinado", en: "Undetermined" }
};

function prettyLabel(dimension: Dimension, raw: string, locale: string): string {
  const lang = locale.startsWith("pt") ? "pt" : "en";
  if (dimension === "device") return DEVICE_LABELS[raw]?.[lang] ?? raw;
  if (dimension === "gender") return GENDER_LABELS[raw]?.[lang] ?? raw;
  if (dimension === "age") {
    const t = raw.replace("AGE_RANGE_", "");
    if (t === "UNDETERMINED") return lang === "pt" ? "Não determinado" : "Undetermined";
    return t.replace("_UP", "+").replace("_", "-");
  }
  return raw;
}

export function ClientGoogleBreakdowns({
  clientId,
  campaignId
}: {
  clientId: string;
  /** Quando fornecido, restringe os breakdowns a uma campanha (uso no drill). */
  campaignId?: string;
}) {
  const t = useTranslations("client");
  const tMetrics = useTranslations("metrics");
  const locale = useLocale();
  const [dimension, setDimension] = useState<Dimension>("device");
  const [range, setRange] = useState(() => lastNDaysRange(30));
  const [rows, setRows] = useState<BreakdownRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    let active = true;
    setRows(null);
    setError(null);
    const campaignParam = campaignId ? `&campaignId=${encodeURIComponent(campaignId)}` : "";
    fetch(
      `/api/clients/${encodeURIComponent(clientId)}/google-ads/breakdowns?dimension=${dimension}&since=${range.since}&until=${range.until}${campaignParam}`
    )
      .then((r) => r.json())
      .then((j) => {
        if (!active) return;
        if (j.ok) setRows(j.rows ?? []);
        else setError(j.error ?? "error");
      })
      .catch(() => active && setError("error"));
    return () => {
      active = false;
    };
  }, [clientId, dimension, range, campaignId]);

  useEffect(() => load(), [load]);

  const maxCost = rows?.reduce((m, r) => Math.max(m, r.cost), 0) ?? 0;
  const sort = useTableSort<BreakdownRow>(rows ?? [], "cost", "desc");

  return (
    <div className="ui-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold">{t("googleBreakdownsTitle")}</div>
        <GoogleDateRangePicker value={range} onChange={setRange} />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {DIMENSIONS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDimension(d)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              dimension === d
                ? "border-transparent bg-[var(--ui-accent)] text-white"
                : "border-[var(--border-color)] text-[var(--text-dim)]"
            }`}
          >
            {t(`googleDim_${d}` as Parameters<typeof t>[0])}
          </button>
        ))}
      </div>

      <div className="mt-3 overflow-x-auto">
        {rows === null && !error ? (
          <TableSkeleton />
        ) : error ? (
          <div className="text-xs text-[var(--text-dim)]">
            {error === "not_linked" ? t("googleAdsNotLinked") : t("googleAdsLoadError")}
          </div>
        ) : rows && rows.length === 0 ? (
          <div className="text-xs text-[var(--text-dim)]">{t("googleBreakdownEmpty")}</div>
        ) : (
          <table className="w-full min-w-[640px] text-xs">
            <thead>
              <tr className="text-left text-[var(--text-dimmer)]">
                <SortableTh label={t(`googleDim_${dimension}` as Parameters<typeof t>[0])} sortKey="label" activeKey={sort.sortKey} dir={sort.sortDir} onSort={sort.toggle} />
                <SortableTh label={tMetrics("impressions")} sortKey="impressions" activeKey={sort.sortKey} dir={sort.sortDir} onSort={sort.toggle} align="right" />
                <SortableTh label={tMetrics("clicks")} sortKey="clicks" activeKey={sort.sortKey} dir={sort.sortDir} onSort={sort.toggle} align="right" />
                <SortableTh label={tMetrics("spend")} sortKey="cost" activeKey={sort.sortKey} dir={sort.sortDir} onSort={sort.toggle} align="right" />
                <SortableTh label={tMetrics("conversions")} sortKey="conversions" activeKey={sort.sortKey} dir={sort.sortDir} onSort={sort.toggle} align="right" />
                <SortableTh label={tMetrics("ctr")} sortKey="ctr" activeKey={sort.sortKey} dir={sort.sortDir} onSort={sort.toggle} align="right" />
                <SortableTh label={tMetrics("cpc")} sortKey="averageCpc" activeKey={sort.sortKey} dir={sort.sortDir} onSort={sort.toggle} align="right" />
              </tr>
            </thead>
            <tbody>
              {sort.sorted.map((row, i) => (
                <tr key={`${row.label}-${i}`} className="border-t border-[var(--border-color)]">
                  <td className="relative py-2 pr-3 font-medium text-[var(--text-main)]">
                    <span
                      className="absolute inset-y-1 left-0 -z-10 rounded bg-[var(--ui-accent-muted)]"
                      style={{ width: maxCost > 0 ? `${(row.cost / maxCost) * 100}%` : "0%" }}
                      aria-hidden
                    />
                    <span className="relative">{prettyLabel(dimension, row.label, locale)}</span>
                  </td>
                  <td className="py-2 pr-3 text-right">{formatNumber(row.impressions, locale)}</td>
                  <td className="py-2 pr-3 text-right">{formatNumber(row.clicks, locale)}</td>
                  <td className="py-2 pr-3 text-right">{formatBRL(row.cost, locale)}</td>
                  <td className="py-2 pr-3 text-right">{formatNumber(row.conversions, locale)}</td>
                  <td className="py-2 pr-3 text-right">{formatPercent(row.ctr * 100, 2, locale)}</td>
                  <td className="py-2 text-right">{formatBRL(row.averageCpc, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
