"use client";

import { ChevronDown, ChevronUp, Sparkles, X } from "lucide-react";
import { useState } from "react";

import {
  CommanderConfidenceBadge,
  CommanderInsightsSummary,
  CommanderNextActionCard,
  CommanderPipeline
} from "./CommanderParts";
import { useCommanderState } from "./useCommanderState";

export function OrionCommanderCompactCard() {
  const { state, researchMode, activeScientists } = useCommanderState("mobile");
  const [level, setLevel] = useState<0 | 1 | 2>(0);
  const open = level > 0;

  return (
    <div className={`campaign-creator-footer-commander lg:hidden ${open ? "" : "mb-2"}`}>
      {open ? (
        <section
          aria-label="Orion Commander"
          className={`campaign-creator-commander-dock commander-premium-shell absolute inset-x-4 z-[70] flex flex-col overflow-hidden rounded-2xl border bg-[var(--creator-card-bg,var(--surface-card))] shadow-[0_-18px_48px_rgba(0,0,0,0.22)] ${
            level === 1
              ? "max-h-[52vh]"
              : "h-[min(76vh,46rem)]"
          }`}
        >
          <CommanderHeader
            confidence={state.confidence}
            insightsCount={state.insightsCount}
            activeScientist={state.activeScientist}
            open
            expanded={level === 2}
            onToggle={() => setLevel(level === 1 ? 2 : 1)}
            onClose={() => setLevel(0)}
          />

          <div className="min-h-0 overflow-y-auto border-t border-[var(--border-color)] px-4 py-4 ds-scroll">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-dimmer)]">
                Pipeline de análise
              </h4>
              <span className="flex items-center gap-1.5 text-[9px] font-medium text-[var(--text-dimmer)]">
                <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 font-semibold text-[var(--amber)]">
                  {researchMode === "scientists"
                    ? `${activeScientists.length} Scientist${activeScientists.length === 1 ? "" : "s"}`
                    : "Sem Scientists"}
                </span>
                {state.pipeline.filter((step) => step.status === "done").length}/{state.pipeline.length}
              </span>
            </div>
            <CommanderPipeline steps={state.pipeline} compact={level === 1} />

            {level === 2 ? (
              <>
                {state.insights.length > 0 ? (
                  <div className="mt-5">
                    <CommanderInsightsSummary insights={state.insights} />
                  </div>
                ) : null}
                <h4 className="mb-2 mt-5 text-xs font-semibold text-[var(--text-main)]">
                  Próxima ação sugerida
                </h4>
                <CommanderNextActionCard state={state} />
              </>
            ) : null}
          </div>
        </section>
      ) : null}

      {!open ? (
        <CommanderHeader
          confidence={state.confidence}
          insightsCount={state.insightsCount}
          activeScientist={state.activeScientist}
          open={false}
          expanded={false}
          onToggle={() => setLevel(1)}
        />
      ) : null}
    </div>
  );
}

function CommanderHeader({
  confidence,
  insightsCount,
  activeScientist,
  open,
  expanded,
  onToggle,
  onClose
}: {
  confidence: number | null;
  insightsCount: number;
  activeScientist?: string;
  open: boolean;
  expanded: boolean;
  onToggle: () => void;
  onClose?: () => void;
}) {
  return (
    <div
      className={`flex min-h-[3.75rem] items-center gap-3 px-3 py-2.5 ${
        open
          ? "bg-[var(--creator-card-bg,var(--surface-card))]"
          : "commander-premium-shell rounded-xl border bg-[var(--creator-card-bg,var(--surface-card))]"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        aria-expanded={open}
      >
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
          <Sparkles size={17} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-[var(--text-main)]">Commander</span>
          <span className="block truncate text-[10px] text-[var(--text-dim)]">
            {insightsCount} insights · {activeScientist ?? "Análise concluída"}
          </span>
        </span>
      </button>

      <CommanderConfidenceBadge value={confidence} />

      {open && onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar Commander"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-dim)] transition-colors hover:bg-[var(--surface-bg)]"
        >
          <X size={17} />
        </button>
      ) : (
        <button
          type="button"
          onClick={onToggle}
          aria-label={expanded ? "Recolher Commander" : "Abrir Commander"}
          className="flex h-8 w-8 shrink-0 items-center justify-center text-[var(--text-dim)]"
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      )}
    </div>
  );
}
