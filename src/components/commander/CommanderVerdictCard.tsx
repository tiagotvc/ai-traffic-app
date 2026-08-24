"use client";

import { CheckCircle2, Lightbulb, Loader2, RotateCw, Sparkles, XCircle } from "lucide-react";

import type { CommanderVerdictResult } from "./useCommanderVerdict";

/** Veredito assertivo do Commander — uma síntese, não mais uma dica por passo. */
export function CommanderVerdictCard({
  verdict,
  loading,
  error,
  onRetry
}: {
  verdict: CommanderVerdictResult | null;
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
}) {
  if (loading) {
    return (
      <div className="campaign-creator-card campaign-creator-card--compact flex items-center gap-2.5 !space-y-0 p-3.5">
        <Loader2 size={16} className="shrink-0 animate-spin text-[var(--ui-accent)]" />
        <p className="text-xs text-[var(--text-dim)]">Commander está avaliando tudo que você preencheu…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-3.5">
        <p className="text-xs text-red-300">{error}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-red-300 hover:underline"
          >
            <RotateCw size={12} />
            Tentar de novo
          </button>
        ) : null}
      </div>
    );
  }

  if (!verdict) return null;

  const approved = verdict.verdict === "approve";

  return (
    <div
      className={`rounded-xl border p-3.5 ${
        approved ? "border-emerald-500/25 bg-emerald-500/[0.07]" : "border-amber-500/25 bg-amber-500/[0.07]"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
            approved ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"
          }`}
        >
          {approved ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Sparkles size={11} className="text-[var(--ui-accent)]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-dimmer)]">
              Veredito do Commander
            </span>
          </div>
          <p className="mt-1 font-heading text-sm font-semibold leading-snug text-[var(--text-main)]">
            {verdict.headline}
          </p>

          {verdict.reasons.length ? (
            <ul className="mt-2 space-y-1">
              {verdict.reasons.map((reason, i) => (
                <li key={i} className="text-[11px] leading-snug text-[var(--text-dim)]">
                  • {reason}
                </li>
              ))}
            </ul>
          ) : null}

          {verdict.fixes.length ? (
            <div className="mt-3 border-t border-[var(--creator-card-border)] pt-2.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-dimmer)]">
                Antes de seguir
              </p>
              <ul className="mt-1.5 space-y-1">
                {verdict.fixes.map((fix, i) => (
                  <li key={i} className="text-[11px] leading-snug text-[var(--text-dim)]">
                    • {fix}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {verdict.suggestions?.length ? (
            <div className="mt-3 border-t border-[var(--creator-card-border)] pt-2.5">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-dimmer)]">
                <Lightbulb size={11} className="text-[var(--ui-accent)]" />
                Sugestões pra vender mais
              </p>
              <ul className="mt-1.5 space-y-1">
                {verdict.suggestions.map((suggestion, i) => (
                  <li key={i} className="text-[11px] leading-snug text-[var(--text-dim)]">
                    • {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
