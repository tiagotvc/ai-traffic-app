"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";

import { BrainShelf } from "@/components/dashboard/BrainShelf";
import { MetricPrism } from "@/components/dashboard/MetricPrism";
import { cn } from "@/lib/cn";
import { buildMarketingDashboardShowcase } from "@/lib/marketing/dashboard-showcase-data";

export function MarketingDashboardShowcase({
  className,
  compact = false
}: {
  className?: string;
  compact?: boolean;
}) {
  const locale = useLocale();
  const tMetrics = useTranslations("metrics");
  const tDashboard = useTranslations("dashboard");
  const tMarketing = useTranslations("marketing");

  const { primaryKPIs, secondaryMetrics } = useMemo(
    () =>
      buildMarketingDashboardShowcase({
        locale,
        metricLabel: (key) => tMetrics(key),
        vsLabel: tDashboard("vsPrevPeriod")
      }),
    [locale, tMetrics, tDashboard]
  );

  return (
    <div
      className={cn(
        "marketing-dashboard-showcase w-full",
        compact ? "max-w-[300px]" : "max-w-[540px]",
        className
      )}
      data-theme="dark"
    >
      <div className="overflow-hidden rounded-2xl border border-white/15 bg-[var(--surface-bg)] shadow-lg shadow-black/25 ring-1 ring-white/10">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#141c26] px-4 py-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-200 ring-1 ring-emerald-400/30">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            {tMarketing("showcaseLive")}
          </span>
          <span className="truncate text-[10px] font-medium text-violet-200/60">{tMarketing("showcaseSampleClient")}</span>
        </div>

        <div className="pointer-events-none select-none space-y-3 p-3 sm:p-4">
          <BrainShelf variant="notice" learningsCount={96} hypothesesCount={0} embedded />

          <MetricPrism
            primaryKPIs={primaryKPIs}
            secondaryMetrics={secondaryMetrics}
            secondaryTitle={tDashboard("supportingTitle")}
            forceDark
          />
        </div>

        <div className="border-t border-white/8 bg-black/20 px-4 py-2 text-center text-[9px] text-violet-400/55">
          {tMarketing("showcaseSampleNote")}
        </div>
      </div>
    </div>
  );
}
