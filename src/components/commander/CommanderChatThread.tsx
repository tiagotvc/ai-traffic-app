"use client";

import { Loader2, RotateCcw, Send } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { DsButton, DsInput } from "@/design-system";
import { CommanderRuleProposalCard } from "@/components/campaign-creator/commander/CommanderParts";
import {
  useAskCommander,
  type CommanderChatDraftSummary,
  type CommanderChatInsight
} from "@/components/campaign-creator/commander/useAskCommander";

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
    messages,
    hydrated,
    error: askError,
    canAsk,
    createRule,
    creatingRuleIndex,
    ruleCreatedIndexes,
    ruleError,
    ruleErrorIndex,
    resetConversation
  } = useAskCommander({ clientSlug, draft, insights });

  const autoAskedRef = useRef(false);
  useEffect(() => {
    if (!autoAsk || autoAskedRef.current || !hydrated || !canAsk) return;
    autoAskedRef.current = true;
    void ask(autoAsk);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAsk, hydrated, canAsk]);

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
          {messages.map((message, index) => (
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
            </div>
          ))}
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
        <button
          type="button"
          onClick={() => void resetConversation()}
          className="mt-3 inline-flex shrink-0 items-center gap-1 self-start text-[11px] text-[var(--text-dimmer)] transition-colors hover:text-[var(--text-main)]"
        >
          <RotateCcw size={11} />
          Reiniciar conversa
        </button>
      ) : null}
    </div>
  );
}
