"use client";

import { useTranslations } from "next-intl";
import { Bar, BarChart, Cell, Tooltip, XAxis, YAxis } from "recharts";

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

const FUNNEL_PALETTE = ["#7c3aed", "#6366f1", "#14b8a6", "#8b5cf6"];

function MarketingFunnelVisual({
  steps,
  rateLabel
}: {
  steps: DashboardFunnelStep[];
  rateLabel: (rate: string) => string;
}) {
  const base = Math.max(steps[0]?.numeric ?? 0, 1);

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-between gap-1.5 py-0.5">
      {steps.map((step, index) => {
        const widthPct = Math.max(38, Math.min(100, (step.numeric / base) * 100));
        const color = FUNNEL_PALETTE[index % FUNNEL_PALETTE.length];

        return (
          <div key={step.id} className="relative flex-1">
            {index > 0 && step.rateFromPrev ? (
              <div className="mb-1 flex items-center justify-center gap-1.5">
                <span
                  className="rounded-full px-2 py-0.5 text-[9px] font-semibold tabular-nums"
                  style={{
                    background: "color-mix(in srgb, #14b8a6 14%, transparent)",
                    color: "#0d9488",
                    border: "1px solid color-mix(in srgb, #14b8a6 28%, transparent)"
                  }}
                >
                  {rateLabel(step.rateFromPrev)}
                </span>
              </div>
            ) : null}
            <div className="flex items-center justify-center">
              <div
                className="relative flex h-9 items-center justify-center overflow-hidden rounded-xl px-3 transition-all sm:h-10"
                style={{
                  width: `${widthPct}%`,
                  background: `linear-gradient(90deg, color-mix(in srgb, ${color} 88%, #fff) 0%, color-mix(in srgb, ${color} 68%, #1e1b4b) 100%)`,
                  boxShadow: `inset 0 1px 0 color-mix(in srgb, #fff 18%, transparent)`
                }}
              >
                <span className="absolute left-2.5 top-1 truncate text-[9px] font-medium text-white/85">
                  {step.label}
                </span>
                <span className="truncate text-[11px] font-bold tabular-nums text-white drop-shadow-sm">
                  {step.value}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

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

function VirtualFunnelPanel({ steps }: { steps: DashboardFunnelStep[] }) {
  const t = useTranslations("dashboard");
  return (
    <PanelShell title={t("widgetFunnelTitle")} subtitle={t("widgetFunnelSubtitle")} className="min-h-[300px]">
      <MarketingFunnelVisual
        steps={steps}
        rateLabel={(rate) => t("widgetFunnelRate", { rate })}
      />
    </PanelShell>
  );
}

function distributionLabelWidth(labels: string[]): number {
  const longest = labels.reduce((max, label) => Math.max(max, label.length), 0);
  return Math.min(128, Math.max(72, longest * 6.5));
}

function CampaignStatusDistributionChart({
  buckets,
  total
}: {
  buckets: DashboardCampaignStatusBucket[];
  total: number;
}) {
  const t = useTranslations("dashboard");
  const chartRows = buckets.map((bucket) => ({
    ...bucket,
    pct: total > 0 ? Math.round((bucket.count / total) * 100) : 0
  }));
  const yAxisWidth = distributionLabelWidth(chartRows.map((row) => row.label));

  return (
    <div className="min-h-0 flex-1">
      <ChartContainer height={Math.max(120, chartRows.length * 34 + 8)} className="w-full min-w-0">
        <PremiumChartFrame compact>
          <BarChart
            data={chartRows}
            layout="vertical"
            margin={{ top: 2, right: 12, left: 4, bottom: 2 }}
          >
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis
              type="category"
              dataKey="label"
              width={yAxisWidth}
              tick={{ ...premiumAxisTick(), fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "rgba(124,58,237,0.06)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.[0]?.payload) return null;
                const row = payload[0].payload as (typeof chartRows)[number];
                return (
                  <div
                    className="rounded-lg border px-3 py-2 text-xs shadow-lg"
                    style={{
                      background: "var(--creator-card-bg, var(--surface-card))",
                      borderColor: "var(--creator-card-border, var(--border-color))"
                    }}
                  >
                    <p className="font-semibold text-[var(--text-main)]">{row.label}</p>
                    <p className="tabular-nums text-[var(--text-dim)]">
                      {t("widgetCampaignStatusTooltip", { count: row.count, pct: row.pct })}
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="pct" radius={[0, 6, 6, 0]} maxBarSize={22}>
              {chartRows.map((row) => (
                <Cell key={row.id} fill={row.color} />
              ))}
            </Bar>
          </BarChart>
        </PremiumChartFrame>
      </ChartContainer>
    </div>
  );
}

function CampaignStatusPanel({
  buckets,
  objectiveBuckets
}: {
  buckets: DashboardCampaignStatusBucket[];
  objectiveBuckets: DashboardCampaignStatusBucket[];
}) {
  const t = useTranslations("dashboard");
  const total = buckets.reduce((sum, b) => sum + b.count, 0);
  const objectiveTotal = objectiveBuckets.reduce((sum, b) => sum + b.count, 0);

  return (
    <div className="flex h-full min-h-[320px] flex-col gap-4">
      <PanelShell title={t("widgetCampaignStatusTitle")} className="flex min-h-0 flex-1 flex-col">
        {total === 0 ? (
          <EmptyPanelNote>{t("widgetCampaignStatusEmpty")}</EmptyPanelNote>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4">
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
            <div className="min-h-0 flex-1 border-t border-[var(--creator-card-border,var(--border-color))] pt-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
                {t("widgetCampaignStatusDistribution")}
              </p>
              <CampaignStatusDistributionChart buckets={buckets} total={total} />
            </div>
          </div>
        )}
      </PanelShell>

      <PanelShell
        title={t("widgetCampaignObjectiveTitle")}
        subtitle={t("widgetCampaignObjectiveSubtitle")}
        className="shrink-0"
      >
        {objectiveTotal === 0 ? (
          <EmptyPanelNote>{t("widgetCampaignObjectiveEmpty")}</EmptyPanelNote>
        ) : (
          <CampaignStatusDistributionChart buckets={objectiveBuckets} total={objectiveTotal} />
        )}
      </PanelShell>
    </div>
  );
}

function TopCampaignsRow({
  byRank,
  bySpend
}: {
  byRank: DashboardTopCampaignRow[];
  bySpend: DashboardTopCampaignRow[];
}) {
  const t = useTranslations("dashboard");

  return (
    <div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-2">
      <TopCampaignsPanel
        title={t("widgetTopCampaignsTitle")}
        subtitle={t("widgetTopCampaignsSubtitle")}
        rows={byRank}
        emptyLabel={t("widgetTopCampaignsEmpty")}
      />
      <TopCampaignsPanel
        title={t("widgetTopBySpendTitle")}
        subtitle={t("widgetTopBySpendSubtitle")}
        rows={bySpend}
        emptyLabel={t("widgetTopCampaignsEmpty")}
      />
    </div>
  );
}

function TopCampaignsPanel({
  title,
  subtitle,
  rows,
  emptyLabel
}: {
  title: string;
  subtitle: string;
  rows: DashboardTopCampaignRow[];
  emptyLabel: string;
}) {
  return (
    <PanelShell title={title} subtitle={subtitle}>
      {rows.length === 0 ? (
        <EmptyPanelNote>{emptyLabel}</EmptyPanelNote>
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
    <PanelShell title={t("widgetAdLibraryTitle")} subtitle={subtitle} className="min-h-[320px]">
      {isLoading ? (
        <div className="skeleton-shimmer h-[160px] w-full rounded-lg" />
      ) : displaySegments.length === 0 ? (
        <EmptyPanelNote>{t("widgetAdLibraryEmpty")}</EmptyPanelNote>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          {insights?.source === "sample" ? (
            <p
              className="shrink-0 rounded-lg border px-2.5 py-1.5 text-[10px]"
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
            <SegmentBarGroup
              title={t("widgetAdLibraryFormats")}
              segments={insights.formats}
            />
          ) : null}
          {insights?.ctas && insights.ctas.length > 0 ? (
            <SegmentBarGroup
              title={t("widgetAdLibraryCtas")}
              segments={insights.ctas}
            />
          ) : null}
        </div>
      )}
    </PanelShell>
  );
}

function SegmentBarGroup({
  title,
  segments
}: {
  title: string;
  segments: { id: string; label: string; sharePct: number; count: number; color: string }[];
}) {
  const maxShare = Math.max(...segments.map((s) => s.sharePct), 1);

  return (
    <div className="min-h-0 flex-1">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
        {title}
      </p>
      <div className="space-y-3">
        {segments.map((seg) => (
          <SegmentBar key={seg.id} segment={seg} maxShare={maxShare} />
        ))}
      </div>
    </div>
  );
}

function SegmentBar({
  segment,
  maxShare
}: {
  segment: { label: string; sharePct: number; count: number; color: string };
  maxShare: number;
}) {
  const widthPct = maxShare > 0 ? (segment.sharePct / maxShare) * 100 : segment.sharePct;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
        <span className="truncate font-medium text-[var(--text-dim)]">{segment.label}</span>
        <span className="shrink-0 tabular-nums text-[var(--text-dimmer)]">
          {segment.sharePct}% · {segment.count}
        </span>
      </div>
      <div
        className="h-3.5 overflow-hidden rounded-full sm:h-4"
        style={{ background: "var(--creator-card-bg-inset, var(--surface-bg))" }}
      >
        <div
          className="h-full min-w-[6%] rounded-full transition-all"
          style={{ width: `${Math.max(widthPct, 8)}%`, background: segment.color }}
        />
      </div>
    </div>
  );
}

export function DashboardInsightPanels({
  funnelSteps,
  campaignStatus,
  campaignObjectives,
  topCampaigns,
  topCampaignsBySpend,
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
  campaignObjectives: DashboardCampaignStatusBucket[];
  topCampaigns: DashboardTopCampaignRow[];
  topCampaignsBySpend: DashboardTopCampaignRow[];
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
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="campaign-creator-card campaign-creator-card--compact xl:col-span-1">
            <div className="skeleton-shimmer mb-2 h-3 w-32 rounded" />
            <div className="skeleton-shimmer h-48 w-full rounded-lg" />
          </div>
          <div className="campaign-creator-card campaign-creator-card--compact xl:col-span-1">
            <div className="skeleton-shimmer mb-2 h-3 w-24 rounded" />
            <div className="skeleton-shimmer h-48 w-full rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="campaign-creator-card campaign-creator-card--compact">
              <div className="skeleton-shimmer mb-2 h-3 w-24 rounded" />
              <div className="skeleton-shimmer h-32 w-full rounded-lg" />
            </div>
          ))}
        </div>
        <div className="campaign-creator-card campaign-creator-card--compact">
          <div className="skeleton-shimmer mb-2 h-3 w-24 rounded" />
          <div className="skeleton-shimmer h-24 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {(showPerformance || showAgeBreakdown) && (
        <div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-2">
          {showPerformance && performanceChart ? (
            <div className="campaign-creator-card campaign-creator-card--compact flex min-h-[400px] min-w-0 flex-col xl:col-span-1">
              <DashboardPerformanceChart
                {...performanceChart}
                title={t("metricsChartTitle")}
                variant="page"
                dualAxisAlways
                fillHeight
              />
            </div>
          ) : null}
          {showAgeBreakdown ? (
            <div className="flex h-full min-h-[400px] min-w-0 xl:col-span-1">
              <AgeBreakdownCard
                rows={ageBreakdown ?? []}
                isLoading={ageBreakdownLoading}
                embedded={false}
              />
            </div>
          ) : null}
        </div>
      )}

      <div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-2">
        <VirtualFunnelPanel steps={funnelSteps} />
        <CampaignStatusPanel buckets={campaignStatus} objectiveBuckets={campaignObjectives} />
      </div>

      <TopCampaignsRow byRank={topCampaigns} bySpend={topCampaignsBySpend} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ProfitByCampaignPanel rows={profitByCampaign} />
        <AdLibraryInsightsPanel insights={adLibraryInsights} isLoading={adLibraryLoading} />
      </div>
    </div>
  );
}
