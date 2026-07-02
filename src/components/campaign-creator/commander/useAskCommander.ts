"use client";

import { useState } from "react";

import { useCampaignDraft } from "@/components/campaign-creator/CampaignDraftContext";
import { adHasMedia, getActiveAd, getActiveAdset } from "@/lib/campaign-draft";
import type { CommanderInsight, CommanderRuleProposal } from "@/lib/commander/types";

/**
 * Chat do Commander: monta o resumo compacto do rascunho + top insights da sessão e
 * pergunta ao `/api/commander/ask`. Uma resposta por vez (a última substitui a anterior).
 * Quando a resposta traz uma proposta de regra (aresta Commander→Engine), expõe
 * `proposal` + `createRule` para o usuário aprovar a criação no painel.
 */
export function useAskCommander(insights: CommanderInsight[]) {
  const { payload, activeNode } = useCampaignDraft();
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<CommanderRuleProposal | null>(null);
  const [creatingRule, setCreatingRule] = useState(false);
  const [ruleCreated, setRuleCreated] = useState(false);
  const [ruleError, setRuleError] = useState<string | null>(null);

  const canAsk = Boolean(payload.clientSlug);

  const ask = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || asking || !canAsk) return;
    setAsking(true);
    setError(null);
    try {
      const adset = getActiveAdset(payload);
      const ad = getActiveAd(payload);
      const res = await fetch("/api/commander/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          clientSlug: payload.clientSlug,
          draft: {
            objective: payload.objective || undefined,
            campaignName: payload.campaign.name || undefined,
            dailyBudgetBRL: payload.campaign.dailyBudgetBRL || undefined,
            adsetName: adset.name || undefined,
            hasMedia: adHasMedia(ad),
            personaSelected: Boolean(adset.personaId),
            step: activeNode ?? undefined
          },
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
      setAnswer(data.answer);
      setProposal(data.ruleProposal ?? null);
      setRuleCreated(false);
      setRuleError(null);
    } catch {
      setError("Não foi possível responder agora.");
    } finally {
      setAsking(false);
    }
  };

  const createRule = async () => {
    if (!proposal || creatingRule || ruleCreated) return;
    setCreatingRule(true);
    setRuleError(null);
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
        return;
      }
      setRuleCreated(true);
    } catch {
      setRuleError("Não foi possível criar a regra.");
    } finally {
      setCreatingRule(false);
    }
  };

  return { ask, asking, answer, error, canAsk, proposal, createRule, creatingRule, ruleCreated, ruleError };
}
