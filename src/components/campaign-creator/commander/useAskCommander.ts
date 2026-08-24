"use client";

import { useEffect, useRef, useState } from "react";

import type { CommanderActionChip, CommanderRuleProposal } from "@/lib/commander/types";

export type CommanderChatDraftSummary = {
  objective?: string;
  campaignName?: string;
  dailyBudgetBRL?: number;
  adsetName?: string;
  hasMedia?: boolean;
  personaSelected?: boolean;
  step?: string;
};

export type CommanderChatInsight = { title: string; description: string; source: string };

export type CommanderChatUsage = { inputTokens: number; outputTokens: number; costUsd?: number };
export type CommanderChatCredits = { used: number; remaining: number; limit: number };

export type CommanderChatMessage = {
  role: "user" | "assistant";
  content: string;
  ruleProposal?: CommanderRuleProposal | null;
  actionChips?: CommanderActionChip[];
  createdAt: string;
  /** Só na mensagem recém-recebida nesta sessão — não persiste, é telemetria de UI. */
  usage?: CommanderChatUsage | null;
  credits?: CommanderChatCredits | null;
};

/**
 * Chat do Commander: memória multi-turn persistida por cliente (`CommanderConversation`).
 * Desacoplado do criador de campanha — recebe `clientSlug` explícito; `draft`/`insights`
 * são opcionais (só existem dentro do fluxo de criação de campanha). Fora dali, o chat
 * roda sem esse contexto extra, só com o histórico da conversa.
 */
export function useAskCommander(params: {
  clientSlug: string | undefined;
  insights?: CommanderChatInsight[];
  draft?: CommanderChatDraftSummary;
}) {
  const { clientSlug, insights = [], draft } = params;
  const [messages, setMessages] = useState<CommanderChatMessage[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [asking, setAsking] = useState(false);
  /** Fase real do que o Commander está fazendo agora (não decorativo) — vem do SSE. */
  const [statusLabel, setStatusLabel] = useState<string | null>(null);
  /** Snapshot mais recente de créditos (não por mensagem — é o total do mês, sempre atual). */
  const [lastCredits, setLastCredits] = useState<CommanderChatCredits | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creatingRuleIndex, setCreatingRuleIndex] = useState<number | null>(null);
  const [ruleCreatedIndexes, setRuleCreatedIndexes] = useState<Set<number>>(new Set());
  const [ruleError, setRuleError] = useState<string | null>(null);
  const [ruleErrorIndex, setRuleErrorIndex] = useState<number | null>(null);
  /** Chave = `${messageIndex}:${chipIndex}` — um chip é um item dentro da mensagem, não a mensagem inteira. */
  const [applyingChipKey, setApplyingChipKey] = useState<string | null>(null);
  const [appliedChipKeys, setAppliedChipKeys] = useState<Set<string>>(new Set());
  const [chipError, setChipError] = useState<string | null>(null);
  const [chipErrorKey, setChipErrorKey] = useState<string | null>(null);

  const canAsk = Boolean(clientSlug);

  // Guarda por ref (não por state) + AbortController: um remount em dev (hot-reload no
  // meio de uma pergunta) não pode deixar duas requisições reais em voo ao mesmo tempo —
  // isso já duplicou resposta E cobrança de crédito numa sessão de teste real.
  const askingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    setMessages([]);
    setHydrated(false);
    if (!clientSlug) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/commander/conversation?clientSlug=${encodeURIComponent(clientSlug)}`);
        const data = (await res.json().catch(() => null)) as
          | { ok?: boolean; messages?: CommanderChatMessage[] }
          | null;
        if (!cancelled && res.ok && data?.ok) setMessages(data.messages ?? []);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientSlug]);

  const ask = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || askingRef.current || !canAsk || !clientSlug) return;
    askingRef.current = true;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setAsking(true);
    setError(null);
    setStatusLabel("Pensando…");
    setMessages((prev) => [...prev, { role: "user", content: trimmed, createdAt: new Date().toISOString() }]);
    try {
      const res = await fetch("/api/commander/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          question: trimmed,
          clientSlug,
          ...(draft ? { draft } : {}),
          insights: insights.slice(0, 6).map((i) => ({
            title: i.title.slice(0, 200),
            description: i.description.slice(0, 500),
            source: i.source.slice(0, 80)
          }))
        })
      });
      if (!res.ok || !res.body) {
        setError("Não foi possível responder agora.");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let gotAnswer = false;
      let gotError = false;

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";
        for (const chunk of chunks) {
          const line = chunk.trim();
          if (!line.startsWith("data:")) continue;
          let event: Record<string, unknown> | null = null;
          try {
            event = JSON.parse(line.slice(5).trim());
          } catch {
            continue;
          }
          if (!event) continue;

          if (event.phase === "status") {
            setStatusLabel(event.label as string);
          } else if (event.phase === "done") {
            gotAnswer = true;
            const credits = (event!.credits as CommanderChatCredits | null) ?? null;
            if (credits) setLastCredits(credits);
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: event!.answer as string,
                ruleProposal: (event!.ruleProposal as CommanderRuleProposal | null) ?? null,
                actionChips: (event!.actionChips as CommanderActionChip[] | undefined) ?? [],
                createdAt: new Date().toISOString(),
                usage: (event!.usage as CommanderChatUsage | undefined) ?? null,
                credits
              }
            ]);
          } else if (event.phase === "error") {
            gotError = true;
            setError((event.error as string) ?? "Não foi possível responder agora.");
          }
        }
      }

      if (!gotAnswer && !gotError) {
        setError("Não foi possível responder agora.");
      }
    } catch (err) {
      // Cancelado por nós mesmos (unmount/hot-reload/nova pergunta) — não é erro de verdade,
      // não mostra mensagem pro usuário.
      if ((err as { name?: string })?.name !== "AbortError") {
        setError("Não foi possível responder agora.");
      }
    } finally {
      askingRef.current = false;
      setAsking(false);
      setStatusLabel(null);
    }
  };

  const resetConversation = async () => {
    if (!clientSlug) return;
    setMessages([]);
    setError(null);
    setRuleError(null);
    setRuleCreatedIndexes(new Set());
    try {
      await fetch("/api/commander/conversation/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientSlug })
      });
    } catch {
      /* melhor esforço — a conversa já foi limpa localmente */
    }
  };

  const createRule = async (messageIndex: number) => {
    const proposal = messages[messageIndex]?.ruleProposal;
    if (!proposal || creatingRuleIndex !== null || ruleCreatedIndexes.has(messageIndex)) return;
    setCreatingRuleIndex(messageIndex);
    setRuleError(null);
    setRuleErrorIndex(null);
    try {
      const res = await fetch("/api/automation/rules", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: proposal.name,
          clientId: proposal.clientId,
          condition: proposal.condition,
          action: proposal.action,
          executionMode: proposal.executionMode
        })
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !data?.ok) {
        setRuleError(data?.error ?? "Não foi possível criar a regra.");
        setRuleErrorIndex(messageIndex);
        return;
      }
      setRuleCreatedIndexes((prev) => new Set(prev).add(messageIndex));
    } catch {
      setRuleError("Não foi possível criar a regra.");
      setRuleErrorIndex(messageIndex);
    } finally {
      setCreatingRuleIndex(null);
    }
  };

  const applyActionChip = async (messageIndex: number, chipIndex: number) => {
    const chip = messages[messageIndex]?.actionChips?.[chipIndex];
    const key = `${messageIndex}:${chipIndex}`;
    if (!chip || applyingChipKey !== null || appliedChipKeys.has(key) || !clientSlug) return;
    setApplyingChipKey(key);
    setChipError(null);
    setChipErrorKey(null);
    try {
      const res = await fetch("/api/commander/apply-action", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientSlug, ...chip })
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !data?.ok) {
        setChipError(data?.error ?? "Não foi possível aplicar a ação.");
        setChipErrorKey(key);
        return;
      }
      setAppliedChipKeys((prev) => new Set(prev).add(key));
    } catch {
      setChipError("Não foi possível aplicar a ação.");
      setChipErrorKey(key);
    } finally {
      setApplyingChipKey(null);
    }
  };

  return {
    ask,
    asking,
    statusLabel,
    lastCredits,
    messages,
    hydrated,
    error,
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
  };
}
