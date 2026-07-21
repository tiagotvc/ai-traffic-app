"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";

import { ChartContainer } from "@/components/ui/ChartContainer";
import { formatBRL, formatNumber, formatPercent } from "@/lib/format";
import { formatDayLabel } from "@/lib/dashboard-ranges";

type GoogleMetricKey =
  | "impressions"
  | "clicks"
  | "cost"
  | "conversions"
  | "ctr"
  | "averageCpc";

type SeriesPoint = Record<GoogleMetricKey, number> & { day: string };

/** Definição de cada métrica do gráfico: rótulo (namespace metrics), cor e formatação. */
const METRICS: Record<
  GoogleMetricKey,
  { label: "impressions" | "clicks" | "spend" | "conversions" | "ctr" | "cpc"; color: string; kind: "number" | "brl" | "percent" }
> = {
  cost: { label: "spend", color: "#4f46e5", kind: "brl" },
  conversions: { label: "conversions", color: "#10b981", kind: "number" },
  clicks: { label: "clicks", color: "#0ea5e9", kind: "number" },
  impressions: { label: "impressions", color: "#a855f7", kind: "number" },
  ctr: { label: "ctr", color: "#f59e0b", kind: "percent" },
  averageCpc: { label: "cpc", color: "#ef4444", kind: "brl" }
};

const ORDER: GoogleMetricKey[] = ["cost", "conversions", "clicks", "impressions", "ctr", "averageCpc"];
const DEFAULT_SELECTED: GoogleMetricKey[] = ["cost", "conversions", "clicks"];
const MAX_SELECTED = 4;

function formatValue(key: GoogleMetricKey, value: number, locale: string): string {
  const kind = METRICS[key].kind;
  if (kind === "brl") return formatBRL(value, locale);
  if (kind === "percent") return formatPercent(value * 100, 2, locale);
  return formatNumber(value, locale);
}

/**
 * Gráfico exclusivo de uma campanha Google Ads (série diária), espelhando o
 * PerformanceChart do Meta. Consome /google-ads/timeseries?campaignId= e permite
 * alternar até 4 métricas-chave.
 */
export function GoogleCampaignChart({
  clientId,
  campaignId,
  since,
  until
}: {
  clientId: string;
  campaignId: string;
  since: string;
  until: string;
}) {
  const t = useTranslations("client");
  const tMetrics = useTranslations("metrics");
  const locale = useLocale();

  const [series, setSeries] = useState<SeriesPoint[] | null>(null);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<GoogleMetricKey[]>(DEFAULT_SELECTED);

  useEffect(() => {
    let active = true;
    setSeries(null);
    setError(false);
    const base = `/api/clients/${encodeURIComponent(clientId)}/google-ads`;
    fetch(`${base}/timeseries?campaignId=${encodeURIComponent(campaignId)}&since=${since}&until=${until}`)
      .then((r) => r.json())
      .then((j) => {
        if (!active) return;
        if (j.ok) setSeries(j.series ?? []);
        else setError(true);
      })
      .catch(() => active && setError(true));
    return () => {
      active = false;
    };
  }, [clientId, campaignId, since, until]);

  const chartData = useMemo(
    () => (series ?? []).map((p) => ({ ...p, label: formatDayLabel(p.day, locale) })),
    [series, locale]
  );

  function toggle(key: GoogleMetricKey) {
    setSelected((cur) =>
      cur.includes(key)
        ? cur.filter((k) => k !== key)
        : cur.length >= MAX_SELECTED
          ? cur
          : [...cur, key]
    );
  }

  return (
    <div className="ui-card p-4">
      <div className="text-sm font-semibold text-[var(--text-main)]">{t("googleChartTitle")}</div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {ORDER.map((key) => {
          const def = METRICS[key];
          const active = selected.includes(key);
          const disabled = !active && selected.length >= MAX_SELECTED;
          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => toggle(key)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                active
                  ? "border-transparent text-white"
                  : disabled
                    ? "cursor-not-allowed border-[var(--border-color)] text-[var(--text-dimmer)]"
                    : "border-[var(--border-color)] text-[var(--text-dim)] hover:bg-[var(--surface-bg)]"
              }`}
              style={active ? { background: def.color } : undefined}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: active ? "rgba(255,255,255,0.85)" : def.color }}
              />
              {tMetrics(def.label)}
            </button>
          );
        })}
      </div>

      {series === null && !error ? (
        <div className="mt-4 h-56 animate-pulse rounded-xl bg-[var(--surface-bg)]" />
      ) : error ? (
        <div className="mt-4 text-xs text-[var(--text-dim)]">{t("googleAdsLoadError")}</div>
      ) : chartData.length === 0 ? (
        <div className="mt-4 text-xs text-[var(--text-dim)]">{t("googleAdsSyncHint")}</div>
      ) : (
        <ChartContainer height="h-56" className="mt-4">
          <LineChart data={chartData}>
            <CartesianGrid stroke="#eef2f7" strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 10 }} />
            {selected.map((key) => (
              <YAxis key={key} yAxisId={key} hide domain={["auto", "auto"]} />
            ))}
            <Tooltip
              contentStyle={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                fontSize: 12
              }}
              labelStyle={{ color: "#64748b" }}
              formatter={(value, _name, item) => {
                const key = (item?.dataKey as GoogleMetricKey) ?? "cost";
                return [formatValue(key, Number(value), locale), tMetrics(METRICS[key].label)];
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {selected.map((key) => (
              <Line
                key={key}
                yAxisId={key}
                type="monotone"
                dataKey={key}
                name={tMetrics(METRICS[key].label)}
                stroke={METRICS[key].color}
                strokeWidth={2}
                dot={chartData.length === 1}
              />
            ))}
          </LineChart>
        </ChartContainer>
      )}
    </div>
  );
}
