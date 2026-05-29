import type { ReactNode } from "react";

import { MiniSparkline } from "@/components/ui/MiniSparkline";

export function KpiCard({
  label,
  value,
  delta,
  deltaPositive,
  icon,
  sparkline,
  sparkColor = "#7c3aed",
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
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {icon ? (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                {icon}
              </div>
            ) : null}
            <div className="text-xs font-medium text-slate-500">{label}</div>
          </div>
          <div className="mt-2 text-xl font-bold tracking-tight text-slate-900 lg:text-2xl">{value}</div>
          {delta ? (
            <div
              className={`mt-1 text-xs font-semibold ${deltaPositive ? "text-emerald-600" : "text-red-600"}`}
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
