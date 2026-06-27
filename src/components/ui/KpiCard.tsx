import type { ReactNode } from "react";

import { MiniSparkline } from "@/components/ui/MiniSparkline";

export function KpiCard({
  label,
  value,
  delta,
  deltaPositive,
  icon,
  sparkline,
  sparkColor = "var(--ui-accent)",
  footer
}: {
  label: string;
  value: string;
  delta?: string;
  deltaPositive?: boolean;
  icon?: ReactNode;
  sparkline?: number[];
  sparkColor?: string;
  footer?: ReactNode;
}) {
  return (
    <div className="ui-card kpi-card-hover p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {icon ? (
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{ background: "rgba(245,166,35,0.12)", color: "var(--amber)" }}
              >
                {icon}
              </div>
            ) : null}
            <div className="text-xs font-medium uppercase tracking-wide text-[var(--text-dimmer)]">
              {label}
            </div>
          </div>
          <div className="font-heading mt-2 text-xl font-bold tracking-tight text-[var(--text-main)] lg:text-2xl">
            {value}
          </div>
          {delta ? (
            <div
              className="mt-1 text-xs font-semibold"
              style={{ color: deltaPositive ? "var(--success)" : "var(--danger)" }}
            >
              {delta}
            </div>
          ) : null}
          {footer}
        </div>
        {sparkline ? <MiniSparkline points={sparkline} color={sparkColor} /> : null}
      </div>
    </div>
  );
}
