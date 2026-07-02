"use client";

import { Loader2, Send, Sparkles } from "lucide-react";
import { useState } from "react";

import { DsButton, DsInput } from "@/design-system";

import {
  CommanderConfidenceBadge,
  CommanderInsightsSummary,
  CommanderNextActionCard,
  CommanderPipeline
} from "./CommanderParts";
import { useAskCommander } from "./useAskCommander";
import { useCommanderState } from "./useCommanderState";

export function OrionCommanderPanel() {
  const { state, analyzing, researchMode, activeScientists } = useCommanderState("desktop");
  const [question, setQuestion] = useState("");
  const { ask, asking, answer, error: askError, canAsk } = useAskCommander(state.insights);
  const completedSteps = state.pipeline.filter((step) => step.status === "done").length;

  return (
    <section
      className="campaign-creator-sidebar-card commander-premium-shell flex min-h-0 flex-col"
      aria-label="Orion Commander"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--ui-accent-muted)] text-[var(--ui-accent)] shadow-[0_0_22px_var(--ui-accent-glow)]">
            <Sparkles size={17} />
          </span>
          <div className="min-w-0">
            <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--ui-accent)]">
              Orion AI
            </div>
            <h3 className="mt-0.5 truncate font-heading text-base font-bold leading-tight text-[var(--text-main)]">
              Commander
            </h3>
          </div>
        </div>
        <CommanderConfidenceBadge value={state.confidence} />
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-[var(--text-dim)]">
        {analyzing
          ? "Recalculando a estratégia com suas alterações…"
          : "Copiloto estratégico da sua campanha, em tempo real."}
      </p>

      <form
        className="mt-3 flex items-center gap-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--creator-card-bg-inset,var(--surface-bg))] p-1.5 transition-colors focus-within:border-amber-500/45"
        onSubmit={(event) => {
          event.preventDefault();
          void ask(question).then(() => setQuestion(""));
        }}
      >
        <span className="sr-only">Pergunte ao Commander</span>
        <DsInput
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder={canAsk ? "Pergunte ao Commander…" : "Selecione um cliente para conversar…"}
          disabled={!canAsk || asking}
          className="h-8 min-w-0 flex-1 border-0 bg-transparent px-2 text-xs shadow-none focus:ring-0"
        />
        <DsButton
          type="submit"
          variant="secondary"
          size="sm"
          iconOnly
          className="border-amber-500/30 bg-amber-500/15 text-[var(--amber-bright)] hover:bg-amber-500/25"
          aria-label="Enviar pergunta"
          disabled={!question.trim() || !canAsk || asking}
        >
          {asking ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </DsButton>
      </form>

      {answer || askError ? (
        <div
          className={`mt-2.5 rounded-xl border p-3 text-[11px] leading-relaxed ${
            askError
              ? "border-red-500/25 bg-red-500/10 text-red-300"
              : "border-amber-500/20 bg-amber-500/[0.06] text-[var(--text-main)]"
          }`}
        >
          {askError ?? answer}
        </div>
      ) : null}

      <div className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-dimmer)]">
            Análise em tempo real
          </h4>
          <span className="flex items-center gap-1.5 text-[9px] text-[var(--text-dimmer)]">
            <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 font-semibold text-[var(--amber)]">
              {researchMode === "scientists"
                ? `${activeScientists.length} Scientist${activeScientists.length === 1 ? "" : "s"}`
                : "Sem Scientists"}
            </span>
            {completedSteps}/{state.pipeline.length}
          </span>
        </div>
        <CommanderPipeline steps={state.pipeline} />
      </div>

      {state.insights.length > 0 ? (
        <div className="mt-5">
          <CommanderInsightsSummary insights={state.insights} />
        </div>
      ) : null}

      <div className="mt-5">
        <h4 className="mb-2 text-xs font-semibold text-[var(--text-main)]">Próxima ação sugerida</h4>
        <CommanderNextActionCard state={state} />
      </div>
    </section>
  );
}
