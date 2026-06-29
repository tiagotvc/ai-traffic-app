"use client";

import { useTranslations } from "next-intl";
import { Bar, BarChart, Cell, Tooltip, XAxis, YAxis } from "recharts";

import { AgeBreakdownCard } from "@/components/dashboard/AgeBreakdownCard";
import { DashboardPerformanceChart } from "@/components/dashboard/DashboardPerformanceChart";
import { PremiumChartFrame } from "@/components/charts/PremiumChartFrame";
import { PremiumChartTooltip } from "@/components/charts/PremiumChartTooltip";
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
const FUNNEL_SHAPE_HEIGHT_PX = 160;

/** Altura normalizada (0–1) de cada borda vertical do funil contínuo. */
function funnelStepNorm(value: number, base: number) {
  if (base <= 0 || value <= 0) return 0.18;
  const ratio = value / base;
  return Math.max(0.18, Math.min(1, Math.pow(ratio, 0.32)));
}

/** Bordas compartilhadas: b[i] = altura na junção esquerda da coluna i (1 = base cheia). */
function computeFunnelBoundaries(steps: DashboardFunnelStep[], base: number) {
  const boundaries: number[] = [1];
  for (let i = 1; i < steps.length; i++) {
    boundaries.push(funnelStepNorm(steps[i].numeric, base));
  }
  const last = funnelStepNorm(steps[steps.length - 1]?.numeric ?? 0, base);
  boundaries.push(Math.max(0.14, last * 0.68));
  return boundaries;
}

function MarketingFunnelVisual({ steps }: { steps: DashboardFunnelStep[] }) {
  const base = Math.max(steps[0]?.numeric ?? 0, 1);
  const boundaries = computeFunnelBoundaries(steps, base);

  return (
    <div className="flex w-full min-w-0 items-center pt-1">
      {steps.map((step, index) => {
        const color = FUNNEL_PALETTE[index % FUNNEL_PALETTE.length];
        const pctOfTop = (step.numeric / base) * 100;
        const leftH = boundaries[index] ?? 1;
        const rightH = boundaries[index + 1] ?? leftH;
        // Funil simétrico: topo e base convergem ao centro (não só a base).
        const leftTop = 50 * (1 - leftH);
        const leftBottom = 50 * (1 + leftH);
        const rightTop = 50 * (1 - rightH);
        const rightBottom = 50 * (1 + rightH);
        const clipPath = `polygon(0 ${leftTop}%, 100% ${rightTop}%, 100% ${rightBottom}%, 0 ${leftBottom}%)`;

        return (
          <div
            key={step.id}
            className={cn(
              "flex min-w-0 flex-1 flex-col justify-end",
              index < steps.length - 1 &&
                "border-r border-[var(--creator-card-border,var(--border-color))]"
            )}
          >
            <div className="mb-3 shrink-0 px-1 text-center">
              <p
                className="truncate text-[10px] font-medium leading-tight text-[var(--text-main)]"
                title={step.label}
              >
                {step.label}
              </p>
              <p className="mt-0.5 text-[10px] tabular-nums text-[var(--text-dimmer)]">
                ({pctOfTop.toLocaleString(undefined, { maximumFractionDigits: 1 })}%)
              </p>
            </div>

            <div className="relative w-full" style={{ height: FUNNEL_SHAPE_HEIGHT_PX }}>
              <div
                className="absolute inset-0"
                style={{
                  clipPath,
                  WebkitClipPath: clipPath,
                  background: `linear-gradient(180deg, color-mix(in srgb, ${color} 94%, #fff) 0%, color-mix(in srgb, ${color} 82%, #0f172a) 100%)`
                }}
                aria-hidden
              />
              <div className="absolute inset-0 flex items-center justify-center px-1">
                <span className="text-center text-[11px] font-bold tabular-nums leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] sm:text-xs">
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
  className,
  compactBody = false,
  titleVariant = "section"
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  /** Conteúdo com altura intrínseca (ex.: funil horizontal) — não estica no grid. */
  compactBody?: boolean;
  /** `panel` = título branco como Performance Geral; `section` = label Orion em caps. */
  titleVariant?: "section" | "panel";
}) {
  return (
    <div
      className={cn(
        "campaign-creator-card campaign-creator-card--compact flex h-full min-h-0 min-w-0 w-full flex-col",
        className
      )}
    >
      <div className={cn("shrink-0", titleVariant === "panel" ? "mb-3" : "mb-1")}>
        <h3
          className={
            titleVariant === "panel"
              ? "font-heading text-sm font-semibold text-[var(--text-main)]"
              : "campaign-creator-orion-section-label"
          }
        >
          {title}
        </h3>
        {subtitle ? (
          <p className="mt-0.5 text-[10px] text-[var(--text-dimmer)]">{subtitle}</p>
        ) : null}
      </div>
      <div className={compactBody ? "shrink-0" : "min-h-0 flex-1"}>{children}</div>
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

export function VirtualFunnelPanel({ steps }: { steps: DashboardFunnelStep[] }) {
  const t = useTranslations("dashboard");
  return (
    <PanelShell
      title={t("widgetFunnelTitle")}
      subtitle={t("widgetFunnelSubtitle")}
      titleVariant="panel"
      compactBody
    >
      <MarketingFunnelVisual steps={steps} />
    </PanelShell>
  );
}

function distributionLabelWidth(labels: string[], maxWidth = 128): number {
  const longest = labels.reduce((max, label) => Math.max(max, label.length), 0);
  return Math.min(maxWidth, Math.max(72, longest * 6.5));
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
  const chartHeight = Math.max(160, chartRows.length * 42 + 16);

  return (
    <div className="min-h-0 w-full flex-1">
      <ChartContainer height={chartHeight} className="w-full min-w-0">
        <PremiumChartFrame compact>
          <BarChart
            data={chartRows}
            layout="vertical"
            margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
            barCategoryGap="32%"
          >
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis
              type="category"
              dataKey="label"
              width={yAxisWidth}
              tick={{ ...premiumAxisTick(), fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval={0}
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
            <Bar dataKey="pct" radius={[0, 6, 6, 0]} maxBarSize={14}>
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

export function CampaignObjectivesPanel({
  objectiveBuckets
}: {
  buckets: DashboardCampaignStatusBucket[];
  objectiveBuckets: DashboardCampaignStatusBucket[];
}) {
  const t = useTranslations("dashboard");
  const objectiveTotal = objectiveBuckets.reduce((sum, b) => sum + b.count, 0);

  return (
    <PanelShell
      title={t("widgetCampaignObjectiveTitle")}
      subtitle={t("widgetCampaignObjectiveSubtitle")}
      titleVariant="panel"
      className="h-full min-h-[280px] w-full"
    >
      {objectiveTotal === 0 ? (
        <EmptyPanelNote>{t("widgetCampaignObjectiveEmpty")}</EmptyPanelNote>
      ) : (
        <CampaignStatusDistributionChart buckets={objectiveBuckets} total={objectiveTotal} />
      )}
    </PanelShell>
  );
}

export function TopCampaignsRow({
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
    <PanelShell title={title} subtitle={subtitle} titleVariant="panel">
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

const PROFIT_BY_CAMPAIGN_ROW_GRID = "grid grid-cols-2 gap-x-3";

function ProfitCampaignBar({
  profit,
  maxProfit
}: {
  profit: number;
  maxProfit: number;
}) {
  const scale = maxProfit * 1.05;
  const positive = profit >= 0;
  const widthPct = positive
    ? Math.min((Math.abs(profit) / scale) * 50, 50)
    : Math.min((Math.abs(profit) / scale) * 100, 100);

  return (
    <div className="relative ml-auto h-4 w-full">
      <div
        className="absolute inset-y-0 w-px -translate-x-1/2 bg-[var(--creator-card-border,var(--border-color))]"
        style={{ left: "50%" }}
        aria-hidden
      />
      <div
        className="absolute inset-y-0"
        style={{
          width: `${widthPct}%`,
          left: positive ? "50%" : undefined,
          right: positive ? undefined : 0,
          borderRadius: positive ? "0 4px 4px 0" : "4px 0 0 4px",
          background: positive ? "#10b981" : "#ef4444"
        }}
      />
    </div>
  );
}

function ProfitCampaignBarTooltip({
  row,
  profitLabel
}: {
  row: DashboardProfitCampaignRow;
  profitLabel: string;
}) {
  return (
    <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 w-max max-w-[min(240px,80vw)] -translate-x-1/2 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
      <PremiumChartTooltip title={row.name}>
        <p className="text-[var(--text-dim)]">{row.clientName}</p>
        <p className="mt-1 tabular-nums text-[var(--text-main)]">{profitLabel}</p>
        <p className="tabular-nums text-[var(--text-dimmer)]">
          {row.spendLabel} · ROAS {row.roasLabel}
        </p>
      </PremiumChartTooltip>
    </div>
  );
}

export function ProfitByCampaignPanel({ rows }: { rows: DashboardProfitCampaignRow[] }) {
  const t = useTranslations("dashboard");
  const maxProfit = Math.max(...rows.map((r) => Math.abs(r.profit)), 1);

  return (
    <PanelShell
      title={t("widgetProfitByCampaignTitle")}
      subtitle={t("widgetProfitByCampaignSubtitle")}
      titleVariant="panel"
    >
      {rows.length === 0 ? (
        <EmptyPanelNote>{t("widgetProfitByCampaignEmpty")}</EmptyPanelNote>
      ) : (
        <div className="px-3 pb-3">
          <div className={cn(PROFIT_BY_CAMPAIGN_ROW_GRID, "mb-3 gap-y-2.5")}>
            {rows.map((row) => (
              <div key={row.id} className="contents">
                <span
                  className="min-w-0 self-center text-[10px] leading-snug text-[var(--text-dim)]"
                  title={row.name}
                >
                  {row.name}
                </span>
                <div className="group relative min-w-0 w-full justify-self-end self-center">
                  <ProfitCampaignBar profit={row.profit} maxProfit={maxProfit} />
                  <ProfitCampaignBarTooltip
                    row={row}
                    profitLabel={t("widgetProfitByCampaignTooltip", { profit: row.profitLabel })}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {rows.slice(0, 4).map((row) => (
              <div
                key={row.id}
                className={cn(
                  PROFIT_BY_CAMPAIGN_ROW_GRID,
                  "rounded-lg border px-3 py-2 text-[10px]"
                )}
                style={{ borderColor: "var(--creator-card-border, var(--border-color))" }}
              >
                <span
                  className="min-w-0 self-center leading-snug text-[var(--text-dim)]"
                  title={row.name}
                >
                  {row.name}
                </span>
                <span
                  className="justify-self-end self-center font-semibold tabular-nums"
                  style={{ color: row.profit >= 0 ? "#10b981" : "#ef4444" }}
                >
                  {row.profitLabel}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </PanelShell>
  );
}

export function AdLibraryInsightsPanel({
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
    <PanelShell
      title={t("widgetAdLibraryTitle")}
      subtitle={subtitle}
      titleVariant="panel"
      className="min-h-[320px]"
    >
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
      <p className="mb-2 text-[11px] font-semibold text-[var(--text-main)]">{title}</p>
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

  const showPerformancePanel = Boolean(showPerformance && performanceChart);
  const showAgePanel = Boolean(showAgeBreakdown);
  const insightPanelCount = Number(showPerformancePanel) + Number(showAgePanel);

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
      {insightPanelCount > 0 ? (
        <div
          className={cn(
            "flex w-full min-w-0 flex-col gap-6",
            insightPanelCount > 1 && "lg:flex-row lg:items-stretch"
          )}
        >
          {showPerformancePanel ? (
            <div className="campaign-creator-card campaign-creator-card--compact flex min-h-[400px] min-w-0 w-full flex-1 basis-0 flex-col">
              <DashboardPerformanceChart
                {...performanceChart!}
                title={t("metricsChartTitle")}
                variant="page"
                chartStyle="line"
                lineVisual="report"
                dualAxisAlways
                fillHeight
              />
            </div>
          ) : null}
          {showAgePanel ? (
            <div className="flex min-h-[400px] min-w-0 w-full flex-1 basis-0">
              <AgeBreakdownCard
                rows={ageBreakdown ?? []}
                isLoading={ageBreakdownLoading}
                embedded={false}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex w-full min-w-0 flex-col gap-6 lg:flex-row lg:items-stretch">
        <div className="flex min-w-0 w-full flex-1 basis-0">
          <VirtualFunnelPanel steps={funnelSteps} />
        </div>
        <div className="flex min-w-0 w-full flex-1 basis-0">
          <CampaignObjectivesPanel buckets={campaignStatus} objectiveBuckets={campaignObjectives} />
        </div>
      </div>

      <TopCampaignsRow byRank={topCampaigns} bySpend={topCampaignsBySpend} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ProfitByCampaignPanel rows={profitByCampaign} />
        <AdLibraryInsightsPanel insights={adLibraryInsights} isLoading={adLibraryLoading} />
      </div>
    </div>
  );
}
