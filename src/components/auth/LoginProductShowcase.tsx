"use client";

import { Brain, Sparkles, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/cn";

export function LoginProductShowcase({
  compact = false,
  animate = true
}: {
  compact?: boolean;
  animate?: boolean;
}) {
  const t = useTranslations("auth");

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
            {t("showcaseLive")}
          </span>
          <span className="text-[9px] font-medium text-violet-200/70">Orion Agency</span>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: t("showcaseKpiRoas"), value: "4.2x", up: true },
            { label: t("showcaseKpiCtr"), value: "2.1%", up: true },
            { label: t("showcaseKpiCpa"), value: "R$18", up: false }
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-lg border border-white/10 bg-white/[0.06] px-2 py-1.5"
            >
              <div className="text-[8px] font-medium uppercase tracking-wide text-violet-200/60">
                {kpi.label}
              </div>
              <div className="mt-0.5 flex items-center gap-0.5 font-heading text-xs font-bold text-white">
                {kpi.value}
                {kpi.up ? <TrendingUp className="h-2.5 w-2.5 text-emerald-400" /> : null}
              </div>
            </div>
          ))}
        </div>

        <div
          className={cn(
            "mt-2.5 flex items-end gap-1 rounded-lg border border-white/10 bg-black/20 px-2 pb-1.5 pt-2",
            compact ? "h-12" : "h-14"
          )}
        >
          {[38, 52, 44, 68, 58, 82, 74].map((h, i) => (
            <div
              key={i}
              className={cn("flex-1 rounded-sm", animate && "login-showcase-bar")}
              style={{
                height: `${h}%`,
                animationDelay: `${i * 80}ms`,
                background:
                  i === 5
                    ? "linear-gradient(180deg, #f5a623, #d4880a)"
                    : "linear-gradient(180deg, rgba(124,58,237,0.9), rgba(79,70,229,0.7))"
              }}
            />
          ))}
        </div>

        <div className="mt-2.5 space-y-1.5">
          <div className="flex items-center gap-2 rounded-lg border border-violet-400/25 bg-violet-500/15 px-2.5 py-1.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-500/30 text-violet-100">
              <Brain className="h-3 w-3" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold text-white">{t("showcaseBrain")}</div>
              <div className="text-[9px] text-violet-200/75">{t("showcaseBrainHint")}</div>
            </div>
            <Sparkles className="h-3 w-3 shrink-0 text-amber-300" />
          </div>

          {!compact ? (
            <div className="flex items-center justify-between rounded-lg border border-amber-400/20 bg-amber-500/10 px-2.5 py-1.5">
              <div>
                <div className="text-[9px] font-medium text-amber-200/80">{t("showcaseCreative")}</div>
                <div className="text-[10px] font-semibold text-white">Hook #1 · Vídeo 15s</div>
              </div>
              <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-200">
                {t("showcaseCreativeDelta")}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
