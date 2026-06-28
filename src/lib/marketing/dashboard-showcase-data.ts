import { METRIC_BY_KEY, type MetricKey } from "@/lib/dashboard-metrics";
import type { KpiCard, SecondaryMetric } from "@/components/dashboard/MetricPrism";

const SPARK_SPEND = [8200, 11200, 9800, 14100, 13200, 15800, 14586];
const SPARK_CTR = [1.8, 2.1, 2.4, 2.9, 3.2, 3.8, 4.32];
const SPARK_REACH = [180000, 195000, 210000, 225000, 238000, 232000, 229559];
const SPARK_CONV = [120, 145, 132, 168, 190, 205, 2078];
const SPARK_CLICKS = [8200, 9100, 9800, 10200, 10800, 11200, 11849];
const SPARK_CPC = [1.45, 1.38, 1.32, 1.28, 1.25, 1.24, 1.23];

type BuildOpts = {
  metricLabel: (key: MetricKey) => string;
  vsLabel: string;
  locale: string;
};

function fmtCurrency(value: number, locale: string): string {
  return value.toLocaleString(locale, { style: "currency", currency: "BRL" });
}

function fmtNumber(value: number, locale: string): string {
  return value.toLocaleString(locale, { maximumFractionDigits: 0 });
}

function fmtPercent(value: number, locale: string): string {
  return value.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";
}

function fmtRatio(value: number, locale: string): string {
  return value.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pct(value: number, locale: string): string {
  const formatted = value.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return `+${formatted}%`;
}

function kpi(
  metricKey: MetricKey,
  value: string,
  change: string,
  trend: "up" | "down" | "neutral",
  sparkData: number[],
  opts: BuildOpts,
  formatSpark?: (n: number) => string
): KpiCard {
  const def = METRIC_BY_KEY[metricKey]!;
  return {
    metricKey,
    label: opts.metricLabel(metricKey),
    value,
    change,
    trend,
    color: def.color,
    sparkData,
    formatSparkValue: formatSpark,
    subLabel: opts.vsLabel
  };
}

export function buildMarketingDashboardShowcase(opts: BuildOpts): {
  primaryKPIs: KpiCard[];
  secondaryMetrics: SecondaryMetric[];
} {
  const { locale } = opts;

  const primaryKPIs: KpiCard[] = [
    kpi(
      "spend",
      fmtCurrency(14585.98, locale),
      pct(173.1, locale),
      "down",
      SPARK_SPEND,
      opts,
      (n) => fmtCurrency(n, locale)
    ),
    kpi("ctr", fmtPercent(4.32, locale), pct(133.2, locale), "up", SPARK_CTR, opts, (n) => fmtPercent(n, locale)),
    kpi(
      "reach",
      fmtNumber(229559, locale),
      pct(1.3, locale),
      "up",
      SPARK_REACH,
      opts,
      (n) => fmtNumber(n, locale)
    ),
    kpi(
      "conversions",
      fmtNumber(2078, locale),
      pct(35.5, locale),
      "up",
      SPARK_CONV,
      opts,
      (n) => fmtNumber(n, locale)
    ),
    kpi(
      "clicks",
      fmtNumber(11849, locale),
      pct(138.7, locale),
      "up",
      SPARK_CLICKS,
      opts,
      (n) => fmtNumber(n, locale)
    ),
    kpi(
      "cpc",
      fmtCurrency(1.23, locale),
      pct(14.4, locale),
      "down",
      SPARK_CPC,
      opts,
      (n) => fmtCurrency(n, locale)
    )
  ];

  const secondaryMetrics: SecondaryMetric[] = [
    { key: "cpm", label: opts.metricLabel("cpm"), value: fmtCurrency(53.21, locale), change: pct(166.8, locale), trend: "down" },
    { key: "roas", label: opts.metricLabel("roas"), value: fmtRatio(3.42, locale), change: pct(12.1, locale), trend: "up" },
    { key: "messages", label: opts.metricLabel("messages"), value: fmtNumber(842, locale), change: pct(8.2, locale), trend: "up" },
    { key: "frequency", label: opts.metricLabel("frequency"), value: fmtRatio(1.19, locale), change: pct(1.1, locale), trend: "up" },
    { key: "impressions", label: opts.metricLabel("impressions"), value: fmtNumber(274100, locale), change: pct(2.4, locale), trend: "up" },
    { key: "cpa", label: opts.metricLabel("cpa"), value: fmtCurrency(7.02, locale), change: pct(5.6, locale), trend: "down" }
  ];

  return { primaryKPIs, secondaryMetrics };
}
