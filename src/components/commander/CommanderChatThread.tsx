"use client";

import { Coins, Database, Loader2, MessageSquare, RotateCcw, Send, Sparkles } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { DsButton, DsInput } from "@/design-system";
import {
  CommanderActionChipCard,
  CommanderRuleProposalCard
} from "@/components/campaign-creator/commander/CommanderParts";
import {
  useAskCommander,
  type CommanderChatCredits,
  type CommanderChatDraftSummary,
  type CommanderChatInsight
} from "@/components/campaign-creator/commander/useAskCommander";

/** Ícone/cor por fase REAL emitida pelo servidor (`ask.ts`'s `emit`) — nada decorativo/fake. */
function statusVisual(label: string | null): { icon: typeof Loader2; tone: string } {
  if (label?.startsWith("Coletando") || label?.startsWith("Buscando")) {
    return { icon: Database, tone: "text-sky-400" };
  }
  if (label?.startsWith("Consultando")) return { icon: Sparkles, tone: "text-[var(--amber-bright)]" };
  return { icon: Loader2, tone: "text-[var(--amber-bright)]" };
}

/** Créditos do MÊS (total da conta), não por mensagem — por isso fica no rodapé, não na bolha. */
function formatCreditsSummary(credits: CommanderChatCredits | null): string | null {
  if (!credits) return null;
  if (credits.limit < 0) return "créditos ilimitados no plano";
  if (credits.remaining < 0) return "uso ilimitado neste ciclo";
  return `${credits.remaining} crédito${credits.remaining === 1 ? "" : "s"} restante${credits.remaining === 1 ? "" : "s"} este mês`;
}

/**
 * UI do chat do Commander (input + histórico + proposta de regra), desacoplada do
 * criador de campanha — só precisa de `clientSlug`. `draft`/`insights` são opcionais e só
 * fazem sentido dentro do fluxo de criação de campanha; fora dali, o chat roda só com a
 * memória da conversa persistida. Usado tanto dentro do `OrionCommanderPanel` (sidebar do
 * criador) quanto em qualquer outro ponto de entrada via `DsSlideOver`.
 */
export function CommanderChatThread({
  clientSlug,
  draft,
  insights,
  emptyHint = null,
  /** Preenche a altura do container pai (uso em painel lateral); senão, lista com teto fixo. */
  fill = false,
  /** Pergunta disparada automaticamente assim que a conversa hidrata — 1x só (ponte de alerta). */
  autoAsk
}: {
  clientSlug: string | undefined;
  draft?: CommanderChatDraftSummary;
  insights?: CommanderChatInsight[];
  emptyHint?: ReactNode | null;
  fill?: boolean;
  autoAsk?: string;
}) {
  const [question, setQuestion] = useState("");
  const {
    ask,
    asking,
    statusLabel,
    lastCredits,
    messages,
    hydrated,
    error: askError,
    canAsk,
    createRule,
    creatingRuleIndex,
    ruleCreatedIndexes,
    ruleError,
    ruleErrorIndex,
    applyActionChip,
    applyingChipKey,
    appliedChipKeys,
    chipError,
    chipErrorKey,
    resetConversation
  } = useAskCommander({ clientSlug, draft, insights });

  const autoAskedRef = useRef(false);
  useEffect(() => {
    if (!autoAsk || autoAskedRef.current || !hydrated || !canAsk) return;
    autoAskedRef.current = true;
    void ask(autoAsk);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAsk, hydrated, canAsk]);

  const status = statusVisual(statusLabel);
  const StatusIcon = status.icon;
  const creditsSummary = formatCreditsSummary(lastCredits);

  return (
    <div className={fill ? "flex h-full min-h-0 flex-col" : ""}>
      <form
        className="flex items-center gap-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--creator-card-bg-inset,var(--surface-bg))] p-1.5 transition-colors focus-within:border-amber-500/45"
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
          className="h-9 min-w-0 flex-1 border-0 bg-transparent px-2 text-sm shadow-none focus:ring-0"
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

      {messages.length > 0 ? (
        <div
          className={
            fill
              ? "mt-3 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-0.5"
              : "mt-2.5 flex max-h-[280px] flex-col gap-2 overflow-y-auto pr-0.5"
          }
        >
          {messages.map((message, index) => {
            return (
              <div key={`${message.role}-${index}-${message.createdAt}`}>
                <div
                  className={`rounded-xl border p-3 text-[11px] leading-relaxed ${
                    message.role === "user"
                      ? "ml-4 border-[var(--border-color)] bg-[var(--creator-card-bg-inset,var(--surface-bg))] text-[var(--text-main)]"
                      : "border-amber-500/20 bg-amber-500/[0.06] text-[var(--text-main)]"
                  }`}
                >
                  {message.content}
                </div>
                {message.ruleProposal ? (
                  <CommanderRuleProposalCard
                    proposal={message.ruleProposal}
                    onCreate={() => void createRule(index)}
                    creating={creatingRuleIndex === index}
                    created={ruleCreatedIndexes.has(index)}
                    error={ruleErrorIndex === index ? ruleError : null}
                  />
                ) : null}
                {message.actionChips?.map((chip, chipIndex) => {
                  const key = `${index}:${chipIndex}`;
                  return (
                    <CommanderActionChipCard
                      key={key}
                      chip={chip}
                      onApply={() => void applyActionChip(index, chipIndex)}
                      applying={applyingChipKey === key}
                      applied={appliedChipKeys.has(key)}
                      error={chipErrorKey === key ? chipError : null}
                    />
                  );
                })}
              </div>
            );
          })}
          {asking ? (
            <div className="flex items-center gap-1.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3 text-[11px] leading-relaxed text-[var(--text-dim)]">
              <StatusIcon size={12} className={`${status.tone} ${status.icon === Loader2 ? "animate-spin" : ""}`} />
              {statusLabel ?? "Pensando…"}
            </div>
          ) : null}
        </div>
      ) : emptyHint ? (
        <p className="mt-3 text-xs leading-relaxed text-[var(--text-dim)]">{emptyHint}</p>
      ) : null}

      {askError ? (
        <div className="mt-2.5 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-[11px] leading-relaxed text-red-300">
          {askError}
        </div>
      ) : null}

      {messages.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-t border-[var(--creator-card-border)] pt-2.5 text-[11px] text-[var(--text-dimmer)]">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {creditsSummary ? (
              <span className="inline-flex items-center gap-1">
                <Coins size={11} />
                {creditsSummary}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <MessageSquare size={11} />
              {messages.length} mensage{messages.length === 1 ? "m" : "ns"} nesta conversa
            </span>
          </div>
          <button
            type="button"
            onClick={() => void resetConversation()}
            className="inline-flex shrink-0 items-center gap-1 transition-colors hover:text-[var(--text-main)]"
          >
            <RotateCcw size={11} />
            Reiniciar conversa
          </button>
        </div>
      ) : null}
    </div>
  );
}
