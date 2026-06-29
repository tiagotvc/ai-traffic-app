"use client";

import { useState } from "react";
import {
  Beaker,
  Brain,
  Check,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  Lightbulb,
  Loader2,
  MapPin,
  Minus,
  TrendingUp,
  Users,
  type LucideIcon
} from "lucide-react";
import { useTranslations } from "next-intl";

import type { ResearchDossier, ResearchSection } from "@/lib/labs/pipelines/types";

const ICONS: Record<string, LucideIcon> = {
  FlaskConical,
  TrendingUp,
  Users,
  MapPin,
  Beaker
};

export type LiveStep = {
  scientistId: string;
  label: string;
  icon?: string;
  status: "running" | "done" | "skipped";
  findings?: number;
};

const TYPE_COLOR: Record<string, string> = {
  hook: "#a855f7",
  offer: "#f5a623",
  angle: "#38bdf8",
  creative_pattern: "#14b8a6",
  saturation: "#ef4444",
  gap: "#10b981",
  avoid: "#ef4444",
  fit: "#10b981",
  misfit: "#ef4444",
  suggestion: "#f5a623",
  insight: "#38bdf8",
  hypothesis: "#a855f7",
  test: "#6366f1",
  prediction: "#10b981",
  metric: "#38bdf8",
  guardrail: "#ef4444"
};

const SOURCE_LABEL_KEYS: Record<string, string> = {
  meta_ad_library: "researchSourceMetaAdLibrary",
  google_serp: "researchSourceGoogleSerp",
  google_trends: "researchSourceGoogleTrends",
  youtube: "researchSourceYoutube",
  google_maps: "researchSourceGoogleMaps",
  simulation: "researchSourceSimulation",
  agency_brain: "researchSourceAgencyBrain"
};

function fmtReach(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

function StepRow({
  step,
  analyzingLabel,
  findingsLabel,
  okLabel
}: {
  step: LiveStep;
  analyzingLabel: string;
  findingsLabel: (count: number) => string;
  okLabel: string;
}) {
  const Icon = step.icon ? (ICONS[step.icon] ?? FlaskConical) : FlaskConical;
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <Icon size={12} className="shrink-0 text-[var(--text-dim)]" aria-hidden />
      <span className={step.status === "skipped" ? "text-[var(--text-dimmer)]" : "text-[var(--text-main)]"}>
        {step.label}
      </span>
      <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-[var(--text-dim)]">
        {step.status === "running" ? (
          <>
            <Loader2 size={11} className="animate-spin" aria-hidden /> {analyzingLabel}
          </>
        ) : step.status === "done" ? (
          <>
            <Check size={11} className="text-emerald-500" aria-hidden />
            {step.findings ? findingsLabel(step.findings) : okLabel}
          </>
        ) : (
          <Minus size={11} aria-hidden />
        )}
      </span>
    </div>
  );
}

function SectionDetail({
  section,
  t
}: {
  section: ResearchSection;
  t: ReturnType<typeof useTranslations<"campaignCreator">>;
}) {
  const Icon = section.icon ? (ICONS[section.icon] ?? FlaskConical) : FlaskConical;
  const sourceLabels = section.sources
    .map((s) => {
      const key = SOURCE_LABEL_KEYS[s];
      return key ? t(key as Parameters<typeof t>[0]) : s;
    })
    .filter(Boolean);

  return (
    <div>
      <p className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-sky-500">
        <Icon size={11} aria-hidden /> {section.label}
        {section.confidence != null ? ` · ${section.confidence}%` : ""}
      </p>
      {section.summary ? (
        <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--text-main)]">{section.summary}</p>
      ) : null}
      {sourceLabels.length ? (
        <p className="mt-1 text-[10px] text-[var(--text-dimmer)]">
          {t("researchWhatWeSearched")}: {sourceLabels.join(" · ")}
        </p>
      ) : null}
      {section.findings.length ? (
        <div className="mt-1.5">
          <p className="text-[10px] font-medium text-[var(--text-dimmer)]">{t("researchWhatWeFound")}</p>
          {section.findings.slice(0, 6).map((f, i) => (
            <p
              key={i}
              className="mt-1 flex items-start gap-1.5 text-[11px] leading-snug text-[var(--text-dim)]"
            >
              <span
                className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: TYPE_COLOR[f.type] ?? "#94a3b8" }}
              />
              <span>
                <span className="font-medium text-[var(--text-main)]">{f.title}</span>
                {f.body ? ` — ${f.body}` : ""}
              </span>
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Card do "resumo" do Orion Brain: feed ao vivo da pipeline (cientistas entrando)
 * + dossiê consolidado (seções + sugestões). Shell estável — nunca some entre fases.
 */
export function ResearchDossierCard({
  dossier,
  loading,
  steps,
  title = "Orion Brain",
  dossierLabelKey,
  forceVisible = false
}: {
  dossier: ResearchDossier | null;
  loading?: boolean;
  steps?: LiveStep[];
  title?: string;
  dossierLabelKey?: string;
  /** Mantém o shell visível mesmo sem conteúdo ainda (primeiro load) */
  forceVisible?: boolean;
}) {
  const t = useTranslations("campaignCreator");
  const [expanded, setExpanded] = useState(false);

  const hasSteps = (steps?.length ?? 0) > 0;
  const hasRunningStep = steps?.some((s) => s.status === "running") ?? false;
  const hasDossierContent =
    Boolean(dossier?.sections.length) || Boolean(dossier?.suggestions.length);

  if (!forceVisible && !loading && !hasSteps && !hasDossierContent) return null;

  const showLiveFeed = loading || hasRunningStep;
  const dossierPhaseLabel = dossierLabelKey
    ? t(dossierLabelKey as Parameters<typeof t>[0])
    : dossier?.label ?? "";

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--creator-card-border,var(--border-color))]">
      <div className="flex items-center gap-2 bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-400 px-3 py-2">
        <Brain size={14} className={`text-white ${loading ? "animate-pulse" : ""}`} aria-hidden />
        <span className="text-[11px] font-semibold text-white">
          {title}
          {hasDossierContent && dossierPhaseLabel
            ? ` · ${dossierPhaseLabel}`
            : showLiveFeed
              ? ` · ${t("researchLabSubtitle")}`
              : ""}
        </span>
        {loading ? (
          <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-medium text-white/90">
            <span className="h-1.5 w-1.5 animate-ping rounded-full bg-white" />
            {t("researchLabLive")}
          </span>
        ) : dossier?.confidence != null ? (
          <span className="ml-auto text-[10px] font-semibold text-white/90">
            {t("researchConfidence", { value: dossier.confidence })}
          </span>
        ) : null}
      </div>

      {showLiveFeed ? (
        <div className="space-y-1.5 border-b border-[var(--creator-card-border,var(--border-color))] px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-500">
            {t("researchLabStarted")}
          </p>
          {(steps ?? []).map((s) => (
            <StepRow
              key={s.scientistId}
              step={s}
              analyzingLabel={t("researchAnalyzing")}
              findingsLabel={(count) => t("researchFindingsCount", { count })}
              okLabel={t("researchStepOk")}
            />
          ))}
          {!hasSteps ? (
            <p className="text-[11px] text-[var(--text-dim)]">{t("researchLabWarming")}</p>
          ) : null}
        </div>
      ) : null}

      {hasDossierContent && dossier ? (
        <div className="px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {dossier.sections.map((s) => {
              const Icon = s.icon ? (ICONS[s.icon] ?? FlaskConical) : FlaskConical;
              return (
                <span
                  key={s.scientistId}
                  className="inline-flex items-center gap-1 rounded-full bg-[var(--ui-soft,rgba(127,127,127,0.12))] px-2 py-0.5 text-[10px] text-[var(--text-dim)]"
                >
                  <Icon size={11} aria-hidden />
                  {s.label}
                  {s.confidence != null ? ` ${s.confidence}%` : ""}
                </span>
              );
            })}
          </div>

          {dossier.reach && (dossier.reach.lower != null || dossier.reach.upper != null) ? (
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[11px] text-[var(--text-dim)]">{t("researchEstimatedReach")}</span>
              <span className="text-xs font-semibold text-[var(--text-main)]">
                {fmtReach(dossier.reach.lower)}–{fmtReach(dossier.reach.upper)}
              </span>
            </div>
          ) : null}

          {dossier.suggestions.length ? (
            <div className="mt-2.5">
              <p className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-amber-500">
                <Lightbulb size={11} aria-hidden /> {t("researchSuggestionsTitle")}
              </p>
              {dossier.suggestions.slice(0, expanded ? 6 : 3).map((sug, i) => (
                <div key={i} className="mt-1.5">
                  <p className="text-[11px] font-semibold leading-snug text-[var(--text-main)]">
                    {sug.title}
                  </p>
                  {sug.body ? (
                    <p className="mt-0.5 text-[11px] leading-snug text-[var(--text-dim)]">{sug.body}</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {expanded ? (
            <div className="mt-3 space-y-2.5 border-t border-[var(--creator-card-border,var(--border-color))] pt-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
                {t("researchMethodologyTitle")}
              </p>
              {dossier.sections.map((s) => (
                <SectionDetail key={s.scientistId} section={s} t={t} />
              ))}
            </div>
          ) : null}

          {dossier.sections.length || dossier.suggestions.length ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-[var(--text-dim)] hover:text-[var(--text-main)]"
            >
              {expanded ? (
                <>
                  <ChevronUp size={12} /> {t("researchCollapse")}
                </>
              ) : (
                <>
                  <ChevronDown size={12} /> {t("researchViewFull")}
                </>
              )}
            </button>
          ) : null}
        </div>
      ) : loading && !showLiveFeed ? (
        <div className="px-3 py-2.5">
          <p className="text-[11px] text-[var(--text-dim)]">{t("researchLabWarming")}</p>
        </div>
      ) : null}
    </div>
  );
}
