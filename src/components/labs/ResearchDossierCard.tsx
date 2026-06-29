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

import type { ResearchDossier } from "@/lib/labs/pipelines/types";

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

function StepRow({ step }: { step: LiveStep }) {
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
            <Loader2 size={11} className="animate-spin" aria-hidden /> analisando…
          </>
        ) : step.status === "done" ? (
          <>
            <Check size={11} className="text-emerald-500" aria-hidden />
            {step.findings ? `${step.findings} achados` : "ok"}
          </>
        ) : (
          <Minus size={11} aria-hidden />
        )}
      </span>
    </div>
  );
}

/**
 * Card do "resumo" do Orion Brain: feed ao vivo da pipeline (cientistas entrando)
 * + dossiê consolidado (seções + sugestões). Presentational — quem usa busca/streama.
 */
export function ResearchDossierCard({
  dossier,
  loading,
  steps,
  title = "Orion Brain"
}: {
  dossier: ResearchDossier | null;
  loading?: boolean;
  steps?: LiveStep[];
  title?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!dossier && !loading && !steps?.length) return null;

  const showFeed = !dossier && (loading || (steps?.length ?? 0) > 0);

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--creator-card-border,var(--border-color))]">
      <div className="flex items-center gap-2 bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-400 px-3 py-2">
        <Brain size={14} className={`text-white ${loading ? "animate-pulse" : ""}`} aria-hidden />
        <span className="text-[11px] font-semibold text-white">
          {title}
          {dossier ? ` · ${dossier.label}` : showFeed ? " · laboratório" : ""}
        </span>
        {loading ? (
          <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-medium text-white/90">
            <span className="h-1.5 w-1.5 animate-ping rounded-full bg-white" />
            ao vivo
          </span>
        ) : dossier?.confidence != null ? (
          <span className="ml-auto text-[10px] font-semibold text-white/90">
            confiança {dossier.confidence}%
          </span>
        ) : null}
      </div>

      {showFeed ? (
        <div className="space-y-1.5 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-500">
            🧪 Laboratório iniciado
          </p>
          {(steps ?? []).map((s) => (
            <StepRow key={s.scientistId} step={s} />
          ))}
          {!steps?.length ? (
            <p className="text-[11px] text-[var(--text-dim)]">Acionando os cientistas…</p>
          ) : null}
        </div>
      ) : dossier ? (
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

          {dossier.suggestions.length ? (
            <div className="mt-2.5">
              <p className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-amber-500">
                <Lightbulb size={11} aria-hidden /> Sugestões
              </p>
              {dossier.suggestions.slice(0, expanded ? 6 : 3).map((sug, i) => (
                <p key={i} className="mt-1 text-[11px] leading-snug text-[var(--text-main)]">
                  · {sug.title}
                </p>
              ))}
            </div>
          ) : null}

          {expanded ? (
            <div className="mt-3 space-y-2.5 border-t border-[var(--creator-card-border,var(--border-color))] pt-2.5">
              {dossier.sections.map((s) => {
                const Icon = s.icon ? (ICONS[s.icon] ?? FlaskConical) : FlaskConical;
                return (
                  <div key={s.scientistId}>
                    <p className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-sky-500">
                      <Icon size={11} aria-hidden /> {s.label}
                      {s.confidence != null ? ` · ${s.confidence}%` : ""}
                    </p>
                    {s.summary ? (
                      <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--text-main)]">
                        {s.summary}
                      </p>
                    ) : null}
                    {s.findings.slice(0, 4).map((f, i) => (
                      <p
                        key={i}
                        className="mt-1 flex items-start gap-1.5 text-[11px] leading-snug text-[var(--text-dim)]"
                      >
                        <span
                          className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: TYPE_COLOR[f.type] ?? "#94a3b8" }}
                        />
                        {f.title}
                      </p>
                    ))}
                  </div>
                );
              })}
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
                  <ChevronUp size={12} /> Recolher
                </>
              ) : (
                <>
                  <ChevronDown size={12} /> Ver pesquisa completa
                </>
              )}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
