import { METRIC_BY_KEY, type MetricKey } from "@/lib/dashboard-metrics";
import type { KpiCard, SecondaryMetric } from "@/components/dashboard/MetricPrism";

const SPARK_SPEND = [8200, 11200, 9800, 14100, 13200, 15800, 14586];
const SPARK_CTR = [1.8, 2.1, 2.4, 2.9, 3.2, 3.8, 4.32];
const SPARK_REACH = [180000, 195000, 210000, 225000, 238000, 232000, 229559];

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
    )
  ];

  const secondaryMetrics: SecondaryMetric[] = [
    { key: "conversions", label: opts.metricLabel("conversions"), value: fmtNumber(2078, locale), change: pct(35.5, locale), trend: "up" },
    { key: "clicks", label: opts.metricLabel("clicks"), value: fmtNumber(11849, locale), change: pct(138.7, locale), trend: "up" },
    { key: "cpc", label: opts.metricLabel("cpc"), value: fmtCurrency(1.23, locale), change: pct(14.4, locale), trend: "down" },
    { key: "cpm", label: opts.metricLabel("cpm"), value: fmtCurrency(53.21, locale), change: pct(166.8, locale), trend: "down" },
    { key: "frequency", label: opts.metricLabel("frequency"), value: fmtRatio(1.19, locale), change: pct(1.1, locale), trend: "up" },
    { key: "impressions", label: opts.metricLabel("impressions"), value: fmtNumber(274100, locale), change: pct(2.4, locale), trend: "up" }
  ];

  return { primaryKPIs, secondaryMetrics };
}
