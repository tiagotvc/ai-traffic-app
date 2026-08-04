"use client";

import { useEffect, useState } from "react";

import type { CommanderRuleProposal } from "@/lib/commander/types";

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

export type CommanderChatMessage = {
  role: "user" | "assistant";
  content: string;
  ruleProposal?: CommanderRuleProposal | null;
  createdAt: string;
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
  const { clientSlug, insights = [], draft = {} } = params;
  const [messages, setMessages] = useState<CommanderChatMessage[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatingRuleIndex, setCreatingRuleIndex] = useState<number | null>(null);
  const [ruleCreatedIndexes, setRuleCreatedIndexes] = useState<Set<number>>(new Set());
  const [ruleError, setRuleError] = useState<string | null>(null);
  const [ruleErrorIndex, setRuleErrorIndex] = useState<number | null>(null);

  const canAsk = Boolean(clientSlug);

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
    if (!trimmed || asking || !canAsk || !clientSlug) return;
    setAsking(true);
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: trimmed, createdAt: new Date().toISOString() }]);
    try {
      const res = await fetch("/api/commander/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          clientSlug,
          draft,
          insights: insights.slice(0, 6).map((i) => ({
            title: i.title.slice(0, 200),
            description: i.description.slice(0, 500),
            source: i.source.slice(0, 80)
          }))
        })
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; answer?: string; error?: string; ruleProposal?: CommanderRuleProposal | null }
        | null;
      if (!res.ok || !data?.ok || !data.answer) {
        setError(data?.error ?? "Não foi possível responder agora.");
        return;
      }
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer!,
          ruleProposal: data.ruleProposal ?? null,
          createdAt: new Date().toISOString()
        }
      ]);
    } catch {
      setError("Não foi possível responder agora.");
    } finally {
      setAsking(false);
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

  return {
    ask,
    asking,
    messages,
    hydrated,
    error,
    canAsk,
    createRule,
    creatingRuleIndex,
    ruleCreatedIndexes,
    ruleError,
    ruleErrorIndex,
    resetConversation
  };
}
