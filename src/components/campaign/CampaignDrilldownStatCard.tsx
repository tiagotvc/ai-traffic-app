"use client";

import { cn } from "@/lib/cn";

export function CampaignDrilldownStatCard({
  label,
  value,
  className
}: {
  label: string;
  value: string | number;
  className?: string;
}) {
  return (
    <div className={cn("ui-drilldown-stat-card", className)}>
      <div className="ui-drilldown-stat-card__label">{label}</div>
      <div className="ui-drilldown-stat-card__value">{value}</div>
    </div>
  );
}
