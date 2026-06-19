"use client";

import { useTranslations } from "next-intl";

import { SCIENTIST_CATALOG } from "@/lib/labs/scientist-catalog";

type LabsLabHeroProps = {
  runningCount: number;
  totalCount: number;
  onNewExperiment?: () => void;
};

function ScientistIcon({ path, className }: { path: string; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={path} />
    </svg>
  );
}

export function LabsLabHero({ runningCount, totalCount, onNewExperiment }: LabsLabHeroProps) {
  const t = useTranslations("agencyBrain");
  const total = SCIENTIST_CATALOG.length;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-slate-900 via-[#1a1033] to-slate-900 text-white shadow-xl">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px)",
          backgroundSize: "28px 28px"
        }}
      />
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-fuchsia-500/15 blur-3xl" />

      <div className="relative flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              {t("labsHeroStatus")}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-violet-200/80">
              {t("labsHeroEyebrow")}
            </span>
          </div>

          <h2 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl">{t("labsHeroTitle")}</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">{t("labsHeroSubtitle")}</p>

          <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
            <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5">
              {t("labsHeroScientistsAvailable", { count: total })}
            </span>
            <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5">
              {t("labsHeroRunning", { count: runningCount })}
            </span>
            <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5">
              {t("labsHeroTotal", { count: totalCount })}
            </span>
          </div>
        </div>

        {onNewExperiment ? (
          <button
            type="button"
            onClick={onNewExperiment}
            className="shrink-0 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-white/15"
          >
            {t("labsNewExperiment")}
          </button>
        ) : null}
      </div>

      <div className="relative border-t border-white/10 px-5 py-4 sm:px-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-300/70">
          {t("labsHeroRosterLabel")}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {SCIENTIST_CATALOG.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-2 rounded-xl border border-violet-400/25 bg-violet-500/10 px-2.5 py-1.5"
              title={`${t(entry.nameKey)} — ${t(entry.briefKey)}`}
            >
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${entry.gradient} text-white shadow`}
              >
                <ScientistIcon path={entry.iconPath} className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-white">{t(entry.nameKey)}</p>
                <p className="text-[10px] text-slate-400">{t(entry.roleKey)}</p>
              </div>
              <span className="ml-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" aria-hidden />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
