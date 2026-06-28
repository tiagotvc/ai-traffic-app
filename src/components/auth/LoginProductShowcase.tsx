"use client";

import { Brain, Sparkles } from "lucide-react";

import { cn } from "@/lib/cn";
import type { ShowcaseCopy } from "@/lib/marketing/showcase-copy";

const BAR_HEIGHTS = [38, 52, 44, 68, 58, 82, 74] as const;

export function LoginProductShowcase({
  copy,
  compact = false,
  animate = true
}: {
  copy: ShowcaseCopy;
  compact?: boolean;
  animate?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative w-full select-none",
        animate && !compact && "login-showcase-float",
        compact ? "max-w-[300px]" : "max-w-[340px]"
      )}
    >
      <div
        className="relative overflow-hidden rounded-2xl border border-white/20 bg-white/[0.08] shadow-2xl shadow-violet-950/40 backdrop-blur-xl"
        style={{ padding: compact ? "0.75rem" : "1rem" }}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

        <div className="mb-2.5 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-200 ring-1 ring-emerald-400/30">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            {copy.live}
          </span>
          <span className="text-[9px] font-medium text-violet-200/70">Orion Agency</span>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {copy.kpis.map((kpi) => (
            <div
              key={kpi.id}
              className="min-w-0 rounded-lg border border-white/10 bg-white/[0.06] px-1.5 py-1.5 text-center sm:px-2"
            >
              <div className="truncate text-[8px] font-medium uppercase tracking-wide text-violet-200/60">
                {kpi.label}
              </div>
              <div className="mt-0.5 truncate font-heading text-xs font-bold tabular-nums text-white/90">
                {kpi.value}
              </div>
            </div>
          ))}
        </div>

        <div
          className={cn(
            "mt-2.5 flex h-14 items-end gap-1 rounded-lg border border-white/10 bg-black/20 px-2 pb-1.5 pt-2",
            compact && "h-12"
          )}
        >
          {BAR_HEIGHTS.map((h, i) => (
            <div
              key={i}
              className={cn("min-h-[6px] flex-1 rounded-sm", animate && "login-showcase-bar")}
              style={{
                height: `${h}%`,
                animationDelay: animate ? `${i * 80}ms` : undefined,
                background:
                  i === 5
                    ? "linear-gradient(180deg, var(--ui-accent), color-mix(in srgb, var(--ui-accent) 70%, #4338ca))"
                    : "linear-gradient(180deg, rgba(124,58,237,0.9), rgba(79,70,229,0.7))"
              }}
            />
          ))}
        </div>

        <div className="mt-2.5 space-y-1.5">
          <div className="flex items-center gap-2 rounded-lg border border-violet-400/25 bg-violet-500/15 px-2.5 py-1.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-500/30 text-violet-100">
              <Brain className="h-3 w-3" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[10px] font-semibold text-white">{copy.brain}</div>
              <div className="truncate text-[9px] text-violet-200/75">{copy.brainHint}</div>
            </div>
            <Sparkles className="h-3 w-3 shrink-0 text-[var(--ui-accent)]" />
          </div>

          {!compact ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] px-2.5 py-1.5">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[9px] font-medium text-[var(--text-dim)]">{copy.creative}</div>
                <div className="truncate text-[10px] font-semibold text-white">{copy.creativeExample}</div>
              </div>
              <span className="shrink-0 rounded-full bg-violet-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-violet-100">
                {copy.creativeTag}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
