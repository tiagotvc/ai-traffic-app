import type { LearningCategory } from "@/db/entities/ClientLearning";
import type { CampaignSignal, SignalTier } from "@/lib/agency-brain/campaign-signal-analyzer";
import { confidenceEnumFromScore } from "@/lib/agency-brain/confidence-score";
import type { SuggestedHypothesisDraft } from "@/lib/agency-brain/hypothesis-rules";
import type { SuggestedLearningDraft, LearningImpact } from "@/lib/agency-brain/types";
import type { SuggestedActionDraft } from "@/lib/action-suggestions/types";
import { computePriorityScore, priorityFromSignal } from "@/lib/agency-brain/priority-score";

const MAX_PER_TYPE = 3;

function impactFromDelta(deltaPercent: number): LearningImpact {
  const abs = Math.abs(deltaPercent);
  if (abs >= 40) return "HIGH";
  if (abs >= 20) return "MEDIUM";
  return "LOW";
}

export function buildSignalDedupeKey(type: string, clientId: string, campaignId: string): string {
  return `signal:${type}:${clientId}:${campaignId}`;
}

function campaignManualUrl(clientSlug: string, metaCampaignId: string): string {
  return `/clients/${clientSlug}/campaigns?campaign=${encodeURIComponent(metaCampaignId)}`;
}

function categoryForSignal(signal: CampaignSignal): LearningCategory {
  if (signal.type === "audience_shift") return "AUDIENCE";
  if (signal.type === "budget_concentration") return "BUDGET";
  if (signal.type === "spend_waste") return "GENERAL";
  return "CREATIVE";
}

function titleForLearning(signal: CampaignSignal): string {
  const name = signal.campaign.campaignName;
  switch (signal.type) {
    case "cpa_efficient":
      return `Campanha "${name}" com CPA abaixo do baseline`;
    case "ctr_strong":
      return `Campanha "${name}" com CTR acima do baseline`;
    case "roas_lift":
      return `ROAS em alta em "${name}"`;
    case "audience_shift":
      return `Público novo performando melhor em "${name}"`;
    case "budget_concentration":
      return `Orçamento concentrado em "${name}"`;
    default:
      return `Sinal forte em "${name}"`;
  }
}

function descriptionForLearning(signal: CampaignSignal): string {
  const delta = Math.abs(signal.deltaPercent).toFixed(0);
  const baseline = signal.baseline;
  if (signal.type === "cpa_efficient" && signal.campaign.cpa != null && baseline.cpa != null) {
    return `CPA R$ ${signal.campaign.cpa.toFixed(2)} vs baseline R$ ${baseline.cpa.toFixed(2)} (${delta}% melhor). Considere escalar.`;
  }
  if (signal.type === "ctr_strong") {
    return `CTR ${signal.campaign.ctr.toFixed(2)}% vs baseline ${baseline.ctr?.toFixed(2) ?? "—"}% (+${delta}%).`;
  }
  if (signal.type === "roas_lift") {
    return `ROAS ${signal.campaign.roas.toFixed(2)} vs baseline ${baseline.roas?.toFixed(2) ?? "—"} (+${delta}%).`;
  }
  return `Métrica com variação de ${delta}% vs baseline da campanha.`;
}

export function signalsToLearningDrafts(
  signals: CampaignSignal[],
  clientId: string,
  windowDays: number
): SuggestedLearningDraft[] {
  const eligible = signals.filter((s) => s.tier === "medium" || s.tier === "strong");
  const byType = new Map<string, CampaignSignal[]>();

  for (const s of eligible) {
    const list = byType.get(s.type) ?? [];
    if (list.length < MAX_PER_TYPE) {
      list.push(s);
      byType.set(s.type, list);
    }
  }

  const drafts: SuggestedLearningDraft[] = [];
  for (const [, list] of byType) {
    for (const signal of list) {
      const ruleId = `signal_${signal.type}`;
      drafts.push({
        title: titleForLearning(signal),
        description: descriptionForLearning(signal),
        category: categoryForSignal(signal),
        impact: impactFromDelta(signal.deltaPercent),
        confidence: confidenceEnumFromScore(signal.confidenceScore),
        confidenceScore: signal.confidenceScore,
        metaCampaignId: signal.campaign.metaCampaignId,
        metricSnapshot: {
          cpa: signal.campaign.cpa ?? undefined,
          ctr: signal.campaign.ctr,
          roas: signal.campaign.roas,
          spend: signal.campaign.spend,
          conversions: signal.campaign.conversions,
          periodDays: windowDays
        },
        evidence: {
          ruleId,
          reason: `Signal ${signal.type} tier ${signal.tier}`,
          deltaPercent: signal.deltaPercent,
          baselineValue: signal.baseline.cpa ?? signal.baseline.ctr ?? undefined,
          actualValue: signal.campaign.cpa ?? signal.campaign.ctr,
          metaCampaignId: signal.campaign.metaCampaignId,
          campaignName: signal.campaign.campaignName,
          comparedTo: signal.baseline.kind
        },
        dedupeKey: buildSignalDedupeKey(signal.type, clientId, signal.campaign.metaCampaignId),
        tags: ["signal", signal.type]
      });
    }
  }

  return drafts;
}

export function signalsToHypothesisDrafts(
  signals: CampaignSignal[],
  clientId: string,
  windowDays: number
): SuggestedHypothesisDraft[] {
  const weak = signals.filter((s) => s.tier === "weak");
  const byType = new Map<string, CampaignSignal[]>();

  for (const s of weak) {
    const list = byType.get(s.type) ?? [];
    if (list.length < MAX_PER_TYPE) {
      list.push(s);
      byType.set(s.type, list);
    }
  }

  const drafts: SuggestedHypothesisDraft[] = [];
  for (const [, list] of byType) {
    for (const signal of list) {
      const ruleId = `hypothesis_${signal.type}`;
      drafts.push({
        title: `Hipótese: ${titleForLearning(signal).replace(/^Campanha /, "")}`,
        description: `${descriptionForLearning(signal)} Sinal fraco — validar com mais dados.`,
        category: categoryForSignal(signal),
        confidenceScore: signal.confidenceScore,
        metaCampaignId: signal.campaign.metaCampaignId,
        metricSnapshot: {
          cpa: signal.campaign.cpa,
          spend: signal.campaign.spend,
          conversions: signal.campaign.conversions,
          periodDays: windowDays
        },
        evidence: {
          ruleId,
          reason: `Weak signal ${signal.type}`,
          deltaPercent: signal.deltaPercent,
          metaCampaignId: signal.campaign.metaCampaignId,
          campaignName: signal.campaign.campaignName
        },
        dedupeKey: buildSignalDedupeKey(`hypothesis_${signal.type}`, clientId, signal.campaign.metaCampaignId),
        tags: ["hypothesis", "signal", signal.type]
      });
    }
  }

  return drafts;
}

export function signalsToActionDrafts(
  signals: CampaignSignal[],
  clientId: string,
  clientSlug: string,
  windowDays: number,
  totalSpend: number
): SuggestedActionDraft[] {
  const strong = signals.filter((s) => s.tier === "strong");
  const usedCampaigns = new Set<string>();
  const drafts: SuggestedActionDraft[] = [];

  for (const signal of strong) {
    if (usedCampaigns.has(signal.campaign.metaCampaignId)) continue;
    usedCampaigns.add(signal.campaign.metaCampaignId);

    let actionType: SuggestedActionDraft["actionType"] = "review_campaign";
    let title = `Revisar "${signal.campaign.campaignName}"`;
    let description = descriptionForLearning(signal);

    if (signal.type === "cpa_efficient" || signal.type === "roas_lift") {
      actionType = "scale_budget";
      const increase = Math.min(30, Math.max(10, Math.round(Math.abs(signal.deltaPercent) / 2)));
      title = `Escalar budget de "${signal.campaign.campaignName}"`;
      description = `${description} Sugestão: aumentar budget em ~${increase}%.`;
      drafts.push({
        title,
        description,
        actionType,
        actionPayload: {
          metaCampaignId: signal.campaign.metaCampaignId,
          campaignName: signal.campaign.campaignName,
          budgetIncreasePercent: increase,
          manualUrl: campaignManualUrl(clientSlug, signal.campaign.metaCampaignId),
          checklist: ["Revisar frequência", "Confirmar capacidade de conversão", `Aumentar budget ~${increase}%`]
        },
        source: "RULE",
        metaCampaignId: signal.campaign.metaCampaignId,
        linkedLearningIds: [],
        priority: priorityFromSignal(signal, totalSpend),
        evidence: {
          ruleId: `action_${signal.type}`,
          reason: `Strong signal ${signal.type}`,
          deltaPercent: signal.deltaPercent,
          campaignName: signal.campaign.campaignName,
          priorityScore: computePriorityScore({
            deltaPercent: signal.deltaPercent,
            spend: signal.campaign.spend,
            totalSpend,
            confidenceScore: signal.confidenceScore
          })
        },
        dedupeKey: buildSignalDedupeKey(`action_${actionType}`, clientId, signal.campaign.metaCampaignId),
      });
      continue;
    }

    if (signal.type === "spend_waste") {
      actionType = "pause_campaign";
      title = `Pausar ou revisar "${signal.campaign.campaignName}"`;
      description = `R$ ${signal.campaign.spend.toFixed(0)} gastos sem conversões.`;
    } else if (signal.type === "saturation") {
      actionType = "refresh_creative";
      title = `Renovar criativos de "${signal.campaign.campaignName}"`;
      description = `Frequência ${signal.campaign.frequency.toFixed(1)} com CTR baixo.`;
    }

    drafts.push({
      title,
      description,
      actionType,
      actionPayload: {
        metaCampaignId: signal.campaign.metaCampaignId,
        campaignName: signal.campaign.campaignName,
        manualUrl: campaignManualUrl(clientSlug, signal.campaign.metaCampaignId),
        checklist: ["Revisar no Meta", "Documentar aprendizado"]
      },
      source: "RULE",
      metaCampaignId: signal.campaign.metaCampaignId,
      linkedLearningIds: [],
      priority: priorityFromSignal(signal, totalSpend),
      evidence: {
        ruleId: `action_${signal.type}`,
        reason: `Strong signal ${signal.type}`,
        deltaPercent: signal.deltaPercent,
        campaignName: signal.campaign.campaignName
      },
      dedupeKey: buildSignalDedupeKey(`action_${actionType}`, clientId, signal.campaign.metaCampaignId)
    });
  }

  return drafts.slice(0, MAX_PER_TYPE);
}

export function filterSignalsByTier(signals: CampaignSignal[], tier: SignalTier): CampaignSignal[] {
  return signals.filter((s) => s.tier === tier);
}
