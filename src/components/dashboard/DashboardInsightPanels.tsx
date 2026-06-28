"use client";

import { useTranslations } from "next-intl";
import { Bar, BarChart, Cell, Pie, PieChart, Tooltip, XAxis, YAxis } from "recharts";

import { AgeBreakdownCard } from "@/components/dashboard/AgeBreakdownCard";
import { DashboardPerformanceChart } from "@/components/dashboard/DashboardPerformanceChart";
import { PremiumChartFrame } from "@/components/charts/PremiumChartFrame";
import { ChartContainer } from "@/components/ui/ChartContainer";
import { cn } from "@/lib/cn";
import type { AgeBreakdownRow } from "@/lib/dashboard-age-breakdown";
import { premiumAxisTick, premiumGridProps } from "@/lib/dashboard/premium-chart-theme";
import type { MetricKey } from "@/lib/dashboard-metrics";
import type {
  DashboardAdLibraryInsights,
  DashboardCampaignStatusBucket,
  DashboardFunnelStep,
  DashboardProfitCampaignRow,
  DashboardTopCampaignRow
} from "@/uxpilot-ui/adapters/dashboard-mappers";

type ChartPoint = { label: string } & Partial<Record<MetricKey, number>>;

const FUNNEL_PALETTE = ["#7c3aed", "#6366f1", "#8b5cf6", "#a78bfa"];

function PanelShell({
  title,
  subtitle,
  children,
  className
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("campaign-creator-card campaign-creator-card--compact flex h-full min-h-0 flex-col", className)}>
      <div className="mb-1 shrink-0">
        <h3 className="campaign-creator-orion-section-label">{title}</h3>
        {subtitle ? (
          <p className="mt-0.5 text-[10px] text-[var(--text-dimmer)]">{subtitle}</p>
        ) : null}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

function EmptyPanelNote({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="rounded-lg border px-3 py-2 text-[11px] text-[var(--text-dim)]"
      style={{
        borderColor: "var(--creator-card-border, var(--border-color))",
        background: "var(--creator-card-bg-inset, var(--surface-bg))"
      }}
    >
      {children}
    </p>
  );
}

function TaperedFunnelVisual({
  steps,
  rateLabel
}: {
  steps: DashboardFunnelStep[];
  rateLabel: (rate: string) => string;
}) {
  const max = Math.max(...steps.map((s) => s.numeric), 1);
  const height = 168;
  const segmentH = height / Math.max(steps.length, 1);
  const maxW = 220;
  const cx = 130;

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-4">
      <svg
        viewBox={`0 0 260 ${height + 8}`}
        className="mx-auto w-full max-w-[260px] shrink-0"
        role="img"
        aria-hidden
      >
        <defs>
          {steps.map((_, i) => (
            <linearGradient key={i} id={`dash-funnel-grad-${i}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={FUNNEL_PALETTE[i % FUNNEL_PALETTE.length]} stopOpacity={0.95} />
              <stop offset="100%" stopColor={FUNNEL_PALETTE[(i + 1) % FUNNEL_PALETTE.length]} stopOpacity={0.7} />
            </linearGradient>
          ))}
        </defs>
        {steps.map((step, i) => {
          const topFrac = Math.max(step.numeric / max, 0.12);
          const nextStep = steps[i + 1];
          const bottomFrac = nextStep ? Math.max(nextStep.numeric / max, 0.08) : topFrac * 0.55;
          const topW = maxW * topFrac;
          const bottomW = maxW * bottomFrac;
          const y = i * segmentH + 2;
          const points = `${cx - topW / 2},${y} ${cx + topW / 2},${y} ${cx + bottomW / 2},${y + segmentH - 3} ${cx - bottomW / 2},${y + segmentH - 3}`;
          return (
            <polygon
              key={step.id}
              points={points}
              fill={`url(#dash-funnel-grad-${i})`}
              stroke="color-mix(in srgb, var(--ui-accent) 25%, transparent)"
              strokeWidth={0.75}
            />
          );
        })}
      </svg>
      <div className="min-w-0 flex-1 space-y-2">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className="flex items-start justify-between gap-2 rounded-lg border px-2.5 py-2"
            style={{
              borderColor: "var(--creator-card-border, var(--border-color))",
              background: "var(--creator-card-bg-inset, var(--surface-bg))"
            }}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: FUNNEL_PALETTE[index % FUNNEL_PALETTE.length] }}
                />
                <span className="text-[11px] font-medium text-[var(--text-dim)]">{step.label}</span>
              </div>
              {index > 0 && step.rateFromPrev ? (
                <p className="mt-0.5 pl-3.5 text-[9px] text-[var(--text-dimmer)]">
                  {rateLabel(step.rateFromPrev)}
                </p>
              ) : null}
            </div>
            <span className="shrink-0 font-heading text-sm font-bold tabular-nums text-[var(--text-main)]">
              {step.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VirtualFunnelPanel({ steps }: { steps: DashboardFunnelStep[] }) {
  const t = useTranslations("dashboard");
  return (
    <PanelShell title={t("widgetFunnelTitle")} subtitle={t("widgetFunnelSubtitle")}>
      <TaperedFunnelVisual
        steps={steps}
        rateLabel={(rate) => t("widgetFunnelRate", { rate })}
      />
    </PanelShell>
  );
}

function CampaignStatusPanel({ buckets }: { buckets: DashboardCampaignStatusBucket[] }) {
  const t = useTranslations("dashboard");
  const total = buckets.reduce((sum, b) => sum + b.count, 0);
  const pieData = buckets.filter((b) => b.count > 0);

  return (
    <PanelShell title={t("widgetCampaignStatusTitle")}>
      {total === 0 ? (
        <EmptyPanelNote>{t("widgetCampaignStatusEmpty")}</EmptyPanelNote>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {pieData.length > 0 ? (
            <ChartContainer height={120} className="mx-auto w-full max-w-[140px] shrink-0 sm:mx-0">
              <PremiumChartFrame compact>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius="52%"
                    outerRadius="88%"
                    paddingAngle={2}
                    stroke="none"
                  >
                    {pieData.map((bucket) => (
                      <Cell key={bucket.id} fill={bucket.color} />
                    ))}
                  </Pie>
                </PieChart>
              </PremiumChartFrame>
            </ChartContainer>
          ) : null}
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
            {buckets.map((bucket) => (
              <div
                key={bucket.id}
                className="rounded-lg border px-2.5 py-2"
                style={{
                  borderColor: "var(--creator-card-border, var(--border-color))",
                  background: "var(--creator-card-bg-inset, var(--surface-bg))"
                }}
              >
                <div className="mb-1 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: bucket.color }} />
                  <span className="text-[10px] font-medium text-[var(--text-dim)]">{bucket.label}</span>
                </div>
                <p className="font-heading text-lg font-bold tabular-nums text-[var(--text-main)]">
                  {bucket.count}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </PanelShell>
  );
}

function TopCampaignsPanel({ rows }: { rows: DashboardTopCampaignRow[] }) {
  const t = useTranslations("dashboard");

  return (
    <PanelShell title={t("widgetTopCampaignsTitle")} subtitle={t("widgetTopCampaignsSubtitle")}>
      {rows.length === 0 ? (
        <EmptyPanelNote>{t("widgetTopCampaignsEmpty")}</EmptyPanelNote>
      ) : (
        <div className="space-y-2">
          {rows.map((row, index) => (
            <div
              key={row.id}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-2.5 py-2",
                index === 0 && "border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)]"
              )}
              style={
                index === 0
                  ? undefined
                  : { borderColor: "var(--creator-card-border, var(--border-color))" }
              }
            >
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold"
                style={{
                  background: index === 0 ? "var(--ui-accent)" : "var(--ui-accent-muted)",
                  color: index === 0 ? "#fff" : "var(--ui-accent)"
                }}
              >
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-semibold text-[var(--text-main)]">{row.name}</p>
                <p className="truncate text-[10px] text-[var(--text-dimmer)]">{row.clientName}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[11px] font-semibold tabular-nums text-[var(--text-main)]">{row.spend}</p>
                <p className="text-[10px] tabular-nums text-[var(--text-dim)]">ROAS {row.roas}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </PanelShell>
  );
}

function ProfitByCampaignPanel({ rows }: { rows: DashboardProfitCampaignRow[] }) {
  const t = useTranslations("dashboard");
  const chartRows = rows.map((row) => ({
    ...row,
    label: row.name.length > 18 ? `${row.name.slice(0, 16)}…` : row.name
  }));
  const maxProfit = Math.max(...rows.map((r) => Math.abs(r.profit)), 1);

  return (
    <PanelShell title={t("widgetProfitByCampaignTitle")} subtitle={t("widgetProfitByCampaignSubtitle")}>
      {rows.length === 0 ? (
        <EmptyPanelNote>{t("widgetProfitByCampaignEmpty")}</EmptyPanelNote>
      ) : (
        <>
          <ChartContainer height={Math.max(140, chartRows.length * 32 + 16)} className="mb-3 w-full">
            <PremiumChartFrame compact>
              <BarChart
                data={chartRows}
                layout="vertical"
                margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
              >
                <XAxis
                  type="number"
                  domain={[-maxProfit * 1.05, maxProfit * 1.05]}
                  tick={premiumAxisTick()}
                  axisLine={false}
                  tickLine={false}
                  hide
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={72}
                  tick={{ ...premiumAxisTick(), fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(124,58,237,0.06)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]?.payload) return null;
                    const row = payload[0].payload as DashboardProfitCampaignRow;
                    return (
                      <div
                        className="rounded-lg border px-3 py-2 text-xs shadow-lg"
                        style={{
                          background: "var(--creator-card-bg, var(--surface-card))",
                          borderColor: "var(--creator-card-border, var(--border-color))"
                        }}
                      >
                        <p className="font-semibold text-[var(--text-main)]">{row.name}</p>
                        <p className="text-[var(--text-dim)]">{row.clientName}</p>
                        <p className="mt-1 tabular-nums text-[var(--text-main)]">
                          {t("widgetProfitByCampaignTooltip", { profit: row.profitLabel })}
                        </p>
                        <p className="tabular-nums text-[var(--text-dimmer)]">
                          {row.spendLabel} · ROAS {row.roasLabel}
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="profit" radius={[0, 4, 4, 0]} maxBarSize={16}>
                  {chartRows.map((row) => (
                    <Cell
                      key={row.id}
                      fill={row.profit >= 0 ? "#10b981" : "#ef4444"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </PremiumChartFrame>
          </ChartContainer>
          <div className="space-y-1.5">
            {rows.slice(0, 4).map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-[10px]"
                style={{ borderColor: "var(--creator-card-border, var(--border-color))" }}
              >
                <span className="min-w-0 truncate text-[var(--text-dim)]">{row.name}</span>
                <span
                  className="shrink-0 font-semibold tabular-nums"
                  style={{ color: row.profit >= 0 ? "#10b981" : "#ef4444" }}
                >
                  {row.profitLabel}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </PanelShell>
  );
}

function AdLibraryInsightsPanel({
  insights,
  isLoading
}: {
  insights: DashboardAdLibraryInsights | null;
  isLoading?: boolean;
}) {
  const t = useTranslations("dashboard");
  const segments = [...(insights?.formats ?? []), ...(insights?.ctas ?? [])].slice(0, 6);
  const displaySegments =
    segments.length > 0
      ? segments
      : (insights?.formats ?? []);

  const subtitle =
    insights?.source === "live"
      ? t("widgetAdLibrarySubtitleLive", { count: insights.adsAnalyzed })
      : insights?.apiConfigured
        ? t("widgetAdLibrarySubtitleSample")
        : t("widgetAdLibrarySubtitleUnconfigured");

  return (
    <PanelShell title={t("widgetAdLibraryTitle")} subtitle={subtitle}>
      {isLoading ? (
        <div className="skeleton-shimmer h-[160px] w-full rounded-lg" />
      ) : displaySegments.length === 0 ? (
        <EmptyPanelNote>{t("widgetAdLibraryEmpty")}</EmptyPanelNote>
      ) : (
        <div className="space-y-3">
          {insights?.source === "sample" ? (
            <p
              className="rounded-lg border px-2.5 py-1.5 text-[10px]"
              style={{
                borderColor: "var(--creator-card-border, var(--border-color))",
                color: "var(--text-dimmer)",
                background: "var(--creator-card-bg-inset, var(--surface-bg))"
              }}
            >
              {insights.apiConfigured ? t("widgetAdLibrarySampleHint") : t("widgetAdLibraryUnconfiguredHint")}
            </p>
          ) : null}
          {insights?.formats && insights.formats.length > 0 ? (
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
                {t("widgetAdLibraryFormats")}
              </p>
              <div className="space-y-1.5">
                {insights.formats.map((seg) => (
                  <SegmentBar key={seg.id} segment={seg} />
                ))}
              </div>
            </div>
          ) : null}
          {insights?.ctas && insights.ctas.length > 0 ? (
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
                {t("widgetAdLibraryCtas")}
              </p>
              <div className="space-y-1.5">
                {insights.ctas.map((seg) => (
                  <SegmentBar key={seg.id} segment={seg} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </PanelShell>
  );
}

function SegmentBar({ segment }: { segment: { label: string; sharePct: number; count: number; color: string } }) {
  return (
    <div>
      <div className="mb-0.5 flex items-center justify-between gap-2 text-[10px]">
        <span className="truncate font-medium text-[var(--text-dim)]">{segment.label}</span>
        <span className="shrink-0 tabular-nums text-[var(--text-dimmer)]">
          {segment.sharePct}% · {segment.count}
        </span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full"
        style={{ background: "var(--creator-card-bg-inset, var(--surface-bg))" }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.max(segment.sharePct, 4)}%`, background: segment.color }}
        />
      </div>
    </div>
  );
}

export function DashboardInsightPanels({
  funnelSteps,
  campaignStatus,
  topCampaigns,
  profitByCampaign,
  adLibraryInsights,
  adLibraryLoading,
  showPerformance,
  showAgeBreakdown,
  performanceChart,
  ageBreakdown,
  ageBreakdownLoading,
  isLoading
}: {
  funnelSteps: DashboardFunnelStep[];
  campaignStatus: DashboardCampaignStatusBucket[];
  topCampaigns: DashboardTopCampaignRow[];
  profitByCampaign: DashboardProfitCampaignRow[];
  adLibraryInsights: DashboardAdLibraryInsights | null;
  adLibraryLoading?: boolean;
  showPerformance?: boolean;
  showAgeBreakdown?: boolean;
  performanceChart?: {
    data: ChartPoint[];
    activeMetrics: MetricKey[];
    onToggleMetric: (key: MetricKey) => void;
    formatValue: (key: MetricKey, value: number) => string;
    metricLabels: Record<MetricKey, string>;
    metricSummary?: Partial<Record<MetricKey, number>>;
    isLoading?: boolean;
    subtitle?: string;
    previewHeight?: number;
    availableMetrics?: MetricKey[];
  };
  ageBreakdown?: AgeBreakdownRow[];
  ageBreakdownLoading?: boolean;
  isLoading?: boolean;
}) {
  const t = useTranslations("dashboard");

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="campaign-creator-card campaign-creator-card--compact xl:col-span-8">
            <div className="skeleton-shimmer mb-2 h-3 w-32 rounded" />
            <div className="skeleton-shimmer h-40 w-full rounded-lg" />
          </div>
          <div className="campaign-creator-card campaign-creator-card--compact xl:col-span-4">
            <div className="skeleton-shimmer mb-2 h-3 w-24 rounded" />
            <div className="skeleton-shimmer h-40 w-full rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="campaign-creator-card campaign-creator-card--compact">
              <div className="skeleton-shimmer mb-2 h-3 w-24 rounded" />
              <div className="skeleton-shimmer h-24 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {(showPerformance || showAgeBreakdown) && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          {showPerformance && performanceChart ? (
            <div className="campaign-creator-card campaign-creator-card--compact flex min-h-0 flex-col xl:col-span-8">
              <DashboardPerformanceChart
                {...performanceChart}
                title={t("metricsChartTitle")}
                variant="page"
                dualAxisAlways
              />
            </div>
          ) : null}
          {showAgeBreakdown ? (
            <div className="xl:col-span-4">
              <AgeBreakdownCard
                rows={ageBreakdown ?? []}
                isLoading={ageBreakdownLoading}
                embedded={false}
              />
            </div>
          ) : null}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <VirtualFunnelPanel steps={funnelSteps} />
        <CampaignStatusPanel buckets={campaignStatus} />
        <TopCampaignsPanel rows={topCampaigns} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ProfitByCampaignPanel rows={profitByCampaign} />
        <AdLibraryInsightsPanel insights={adLibraryInsights} isLoading={adLibraryLoading} />
      </div>
    </div>
  );
}
