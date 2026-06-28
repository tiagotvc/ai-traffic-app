"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/cn";
import type {
  DashboardCampaignStatusBucket,
  DashboardFunnelStep,
  DashboardMetricSection,
  DashboardTopCampaignRow
} from "@/uxpilot-ui/adapters/dashboard-mappers";

function TrendPill({
  change,
  trend
}: {
  change: string;
  trend: "up" | "down" | "neutral";
}) {
  const color = trend === "neutral" ? "#94a3b8" : trend === "up" ? "#10b981" : "#ef4444";
  return (
    <span
      className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold tabular-nums"
      style={{ background: `${color}18`, color }}
    >
      {change}
    </span>
  );
}

function MetricSectionGrid({ section }: { section: DashboardMetricSection }) {
  return (
    <div className="dashboard-card dashboard-card--compact">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
        {section.title}
      </p>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {section.cells.map((cell) => (
          <div
            key={cell.key}
            className="dashboard-metric-chip flex min-w-[4.5rem] flex-col gap-1 px-2 py-2"
          >
            <span className="text-[9px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
              {cell.label}
            </span>
            <div className="flex items-end justify-between gap-1.5">
              <span className="min-w-0 font-heading text-[11px] font-bold leading-tight tabular-nums text-[var(--text-main)]">
                {cell.value}
              </span>
              <TrendPill change={cell.change} trend={cell.trend} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VirtualFunnelPanel({ steps }: { steps: DashboardFunnelStep[] }) {
  const t = useTranslations("dashboard");
  const max = Math.max(...steps.map((s) => s.numeric), 1);

  return (
    <div className="dashboard-card dashboard-card--compact">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
        {t("widgetFunnelTitle")}
      </p>
      <div className="space-y-2">
        {steps.map((step, index) => {
          const widthPct = step.numeric > 0 ? Math.max(8, (step.numeric / max) * 100) : 8;
          return (
            <div key={step.id} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="font-medium text-[var(--text-dim)]">{step.label}</span>
                <span className="font-heading font-semibold tabular-nums text-[var(--text-main)]">
                  {step.value}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-bg)]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${widthPct}%`,
                    background: `linear-gradient(90deg, rgba(124,58,237,0.85), rgba(167,139,250,0.95))`
                  }}
                />
              </div>
              {index > 0 && step.rateFromPrev ? (
                <p className="text-[9px] text-[var(--text-dimmer)]">
                  {t("widgetFunnelRate", { rate: step.rateFromPrev })}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CampaignStatusPanel({ buckets }: { buckets: DashboardCampaignStatusBucket[] }) {
  const t = useTranslations("dashboard");
  const total = buckets.reduce((sum, b) => sum + b.count, 0);

  return (
    <div className="dashboard-card dashboard-card--compact">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
        {t("widgetCampaignStatusTitle")}
      </p>
      {total === 0 ? (
        <p className="rounded-lg border px-3 py-2 text-[11px] text-[var(--text-dim)]" style={{ borderColor: "var(--border-color)" }}>
          {t("widgetCampaignStatusEmpty")}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {buckets.map((bucket) => (
            <div
              key={bucket.id}
              className="rounded-lg border px-2.5 py-2"
              style={{ borderColor: "var(--border-color)", background: "var(--surface-bg)" }}
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
      )}
    </div>
  );
}

function TopCampaignsPanel({ rows }: { rows: DashboardTopCampaignRow[] }) {
  const t = useTranslations("dashboard");

  return (
    <div className="dashboard-card dashboard-card--compact">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
        {t("widgetTopCampaignsTitle")}
      </p>
      {rows.length === 0 ? (
        <p className="rounded-lg border px-3 py-2 text-[11px] text-[var(--text-dim)]" style={{ borderColor: "var(--border-color)" }}>
          {t("widgetTopCampaignsEmpty")}
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((row, index) => (
            <div
              key={row.id}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-2.5 py-2",
                index === 0 && "border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)]"
              )}
              style={index === 0 ? undefined : { borderColor: "var(--border-color)" }}
            >
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold"
                style={{ background: "rgba(124,58,237,0.16)", color: "#a78bfa" }}
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
    </div>
  );
}

export function DashboardInsightPanels({
  metricSections,
  funnelSteps,
  campaignStatus,
  topCampaigns,
  isLoading
}: {
  metricSections: DashboardMetricSection[];
  funnelSteps: DashboardFunnelStep[];
  campaignStatus: DashboardCampaignStatusBucket[];
  topCampaigns: DashboardTopCampaignRow[];
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-[var(--app-section-gap)] xl:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="dashboard-card dashboard-card--compact">
            <div className="skeleton-shimmer mb-2 h-3 w-24 rounded" />
            <div className="skeleton-shimmer h-24 w-full rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {metricSections.map((section) => (
          <MetricSectionGrid key={section.id} section={section} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <VirtualFunnelPanel steps={funnelSteps} />
        <CampaignStatusPanel buckets={campaignStatus} />
        <TopCampaignsPanel rows={topCampaigns} />
      </div>
    </div>
  );
}
