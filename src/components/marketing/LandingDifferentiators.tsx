"use client";

import { CheckCircle2, FileText, FlaskConical, Sparkles, UserSearch } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactElement } from "react";

import { MarketingReveal } from "@/components/marketing/motion/MarketingReveal";
import { cn } from "@/lib/cn";

type DiffKey = "diff1" | "diff2" | "diff3";

const DIFFERENTIATORS: { key: DiffKey; icon: LucideIcon; points: number }[] = [
  { key: "diff1", icon: UserSearch, points: 4 },
  { key: "diff2", icon: Sparkles, points: 4 },
  { key: "diff3", icon: FileText, points: 4 }
];

function PersonaVisual() {
  const t = useTranslations("marketing");
  const tags = ["diff1Tag1", "diff1Tag2", "diff1Tag3", "diff1Tag4"] as const;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-heading text-sm font-semibold text-[var(--text-main)]">{t("diff1VisualName")}</span>
        <span className="rounded-full bg-[var(--ui-accent-muted)] px-2 py-0.5 text-[10px] font-semibold text-[var(--ui-accent)]">
          {t("diff1VisualType")}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((k) => (
          <span
            key={k}
            className="rounded-md border border-[var(--border-color)] bg-[var(--surface-bg)] px-2 py-1 text-[11px] text-[var(--text-dim)]"
          >
            {t(k)}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-1.5 border-t border-[var(--border-color)] pt-3 text-[11px] font-medium text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {t("diff1VisualFoot")}
      </div>
    </div>
  );
}

function CopilotVisual() {
  const t = useTranslations("marketing");
  const scientists = ["diff2Sci1", "diff2Sci2", "diff2Sci3"] as const;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
          <FlaskConical className="h-3.5 w-3.5 text-[var(--ui-accent)]" />
          {t("diff2VisualLabel")}
        </span>
        {scientists.map((k) => (
          <span
            key={k}
            className="rounded-full border border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] px-2 py-0.5 text-[11px] font-medium text-[var(--ui-accent)]"
          >
            {t(k)}
          </span>
        ))}
      </div>
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] p-3">
        <p className="text-[11px] text-[var(--text-dim)]">{t("diff2VisualDossier")}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-[var(--text-main)]">{t("diff2VisualProposal")}</span>
          <span className="rounded-md bg-[var(--ui-accent)] px-2.5 py-1 text-[10px] font-bold text-[var(--ui-accent-btn-text)]">
            {t("diff2VisualApprove")}
          </span>
        </div>
      </div>
    </div>
  );
}

function ReportVisual() {
  const t = useTranslations("marketing");
  const kpis = ["diff3Kpi1", "diff3Kpi2", "diff3Kpi3"] as const;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-heading text-sm font-semibold text-[var(--text-main)]">{t("diff3VisualTitle")}</span>
        <span className="rounded-full bg-[var(--ui-accent-muted)] px-2 py-0.5 text-[10px] font-semibold text-[var(--ui-accent)]">
          PDF
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {kpis.map((k) => (
          <div key={k} className="rounded-md border border-[var(--border-color)] bg-[var(--surface-bg)] px-2 py-1.5 text-center">
            <span className="block text-xs font-bold text-[var(--ui-accent)]">{t(`${k}Value`)}</span>
            <span className="block text-[9px] text-[var(--text-dimmer)]">{t(`${k}Label`)}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 border-t border-[var(--border-color)] pt-3 text-[11px] font-medium text-[var(--text-dim)]">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        {t("diff3VisualSchedule")}
      </div>
    </div>
  );
}

const VISUALS: Record<DiffKey, () => ReactElement> = {
  diff1: PersonaVisual,
  diff2: CopilotVisual,
  diff3: ReportVisual
};

export function LandingDifferentiators() {
  const t = useTranslations("marketing");

  return (
    <section id="product" className="marketing-section marketing-section-highlight">
      <div className="mx-auto max-w-6xl">
        <MarketingReveal className="mx-auto max-w-2xl text-center">
          <p className="marketing-section-title">{t("diffBadge")}</p>
          <h2 className="marketing-section-heading">{t("diffTitle")}</h2>
          <p className="marketing-section-sub mx-auto max-w-2xl">{t("diffSubtitle")}</p>
        </MarketingReveal>

        <div className="mt-14 space-y-12 lg:space-y-20">
          {DIFFERENTIATORS.map(({ key, icon: Icon, points }, i) => {
            const Visual = VISUALS[key];
            return (
              <MarketingReveal key={key}>
                <div
                  className={cn(
                    "grid items-center gap-8 lg:grid-cols-2 lg:gap-14",
                    i % 2 === 1 && "lg:[&>*:first-child]:order-2"
                  )}
                >
                  <div>
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--ui-accent-muted)] text-[var(--ui-accent)] ring-1 ring-[var(--ui-accent-border)]">
                      <Icon className="h-5 w-5" strokeWidth={1.75} />
                    </span>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-[var(--ui-accent)]">
                      {t(`${key}Eyebrow`)}
                    </p>
                    <h3 className="mt-1.5 font-heading text-2xl font-bold leading-tight tracking-tight text-[var(--text-main)] sm:text-3xl">
                      {t(`${key}Title`)}
                    </h3>
                    <p className="mt-3 text-pretty text-base leading-relaxed text-[var(--text-dim)]">{t(`${key}Body`)}</p>
                    <ul className="mt-5 space-y-2.5">
                      {Array.from({ length: points }, (_, p) => `${key}Point${p + 1}`).map((pk) => (
                        <li key={pk} className="flex items-start gap-2.5 text-sm text-[var(--text-main)]">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ui-accent)]" />
                          {t(pk)}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="relative">
                    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-card)] p-5 shadow-lg shadow-black/20 ring-1 ring-[var(--ui-accent-border)]">
                      <Visual />
                    </div>
                  </div>
                </div>
              </MarketingReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
