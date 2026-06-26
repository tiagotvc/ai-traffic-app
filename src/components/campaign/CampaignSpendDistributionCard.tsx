"use client";

import { useMemo } from "react";

import { cn } from "@/lib/cn";

export type SpendShareSlice = {
  id: string;
  name: string;
  pct: number;
  spend: number;
};

const SLICE_COLORS = [
  "var(--ui-accent)",
  "color-mix(in srgb, var(--ui-accent) 68%, var(--text-dimmer))",
  "color-mix(in srgb, var(--ui-accent) 45%, var(--border-color))",
  "color-mix(in srgb, var(--ui-accent-btn-to) 72%, var(--surface-card))",
  "color-mix(in srgb, var(--ui-accent) 32%, var(--surface-card))"
] as const;

function sliceColor(index: number): string {
  return SLICE_COLORS[index % SLICE_COLORS.length];
}

export function CampaignSpendDistributionCard({
  title,
  slices,
  totalSpend,
  formatSpend,
  emptyLabel,
  totalLabel = "Total",
  className
}: {
  title: string;
  slices: SpendShareSlice[];
  totalSpend: number;
  formatSpend: (value: number) => string;
  emptyLabel: string;
  totalLabel?: string;
  className?: string;
}) {
  const activeSlices = useMemo(
    () => [...slices].filter((s) => s.spend > 0).sort((a, b) => b.spend - a.spend),
    [slices]
  );

  const gradient = useMemo(() => {
    if (!activeSlices.length) return null;
    const totalPct = activeSlices.reduce((sum, s) => sum + s.pct, 0) || 1;
    let cursor = 0;
    return activeSlices
      .map((s, i) => {
        const span = (s.pct / totalPct) * 100;
        const start = cursor;
        cursor += span;
        return `${sliceColor(i)} ${start}% ${cursor}%`;
      })
      .join(", ");
  }, [activeSlices]);

  return (
    <div className={cn("ui-spend-distribution-card", className)}>
      <h3 className="ui-spend-distribution-card__title">{title}</h3>

      {activeSlices.length ? (
        <div className="mt-3 flex items-start gap-5">
          <div className="relative h-[7.5rem] w-[7.5rem] shrink-0">
            <div
              className="h-full w-full rounded-full ring-1 ring-[color-mix(in_srgb,var(--border-color)_80%,transparent)]"
              style={{
                background: gradient ? `conic-gradient(${gradient})` : undefined
              }}
            />
            <div className="absolute inset-[26%] flex flex-col items-center justify-center rounded-full bg-[var(--surface-card)] px-1 text-center ring-1 ring-[color-mix(in_srgb,var(--border-color)_80%,transparent)]">
              <span className="text-[9px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
                {totalLabel}
              </span>
              <span className="mt-0.5 max-w-full truncate text-[11px] font-bold tabular-nums text-[var(--text-main)]">
                {formatSpend(totalSpend)}
              </span>
            </div>
          </div>

          <ul className="min-w-0 flex-1 space-y-1.5">
            {activeSlices.map((slice, i) => (
              <li
                key={slice.id}
                className="grid grid-cols-[0.5rem_minmax(0,1fr)_2.75rem] items-center gap-x-2 text-xs"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: sliceColor(i) }}
                />
                <span className="min-w-0 truncate text-[var(--text-dim)]" title={slice.name}>
                  {slice.name}
                </span>
                <span className="text-right tabular-nums font-semibold text-[var(--text-main)]">
                  {slice.pct.toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-3 text-xs text-[var(--text-dimmer)]">{emptyLabel}</p>
      )}
    </div>
  );
}
