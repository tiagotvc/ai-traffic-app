import {
  buildCampaignDraftChecklist,
  getActiveAdset,
  type CampaignDraftCheckKey,
  type CampaignDraftPayload
} from "@/lib/campaign-draft";

export type CommanderReviewCheckItem = {
  key: string;
  label: string;
  complete: boolean;
};

export type CommanderReviewOpportunity = {
  id: string;
  title: string;
  description: string;
};

const CHECK_LABELS: Record<CampaignDraftCheckKey, string> = {
  campaign: "Objetivo e campanha configurados",
  adset: "Público com segmentação definida",
  ad: "Anúncio completo",
  media: "Mídia adicionada ao criativo",
  titles: "Textos do anúncio preenchidos"
};

const LOW_BUDGET_THRESHOLD_BRL = 20;

/** Checklist da revisão final: reaproveita as mesmas regras do score (buildCampaignDraftChecklist) + conversão. */
export function buildCommanderReviewChecklist(payload: CampaignDraftPayload): CommanderReviewCheckItem[] {
  const adset = getActiveAdset(payload);
  return [
    ...buildCampaignDraftChecklist(payload).map((item) => ({
      key: item.key,
      label: CHECK_LABELS[item.key],
      complete: item.complete
    })),
    {
      key: "conversion",
      label: "Conversão configurada",
      complete: Boolean(adset.pixelId && adset.conversionEvent)
    }
  ];
}

/**
 * Oportunidades derivadas só de campos reais do rascunho — nada de heurística de
 * tamanho de público (não existe sinal de reach/tamanho persistido no draft).
 */
export function buildCommanderReviewOpportunities(
  payload: CampaignDraftPayload
): CommanderReviewOpportunity[] {
  const adset = getActiveAdset(payload);
  const opportunities: CommanderReviewOpportunity[] = [];

  if (adset.targeting.customAudienceIds.length === 0) {
    opportunities.push({
      id: "remarketing",
      title: "Remarketing ausente",
      description: "Nenhum público personalizado de remarketing foi adicionado a este conjunto."
    });
  }

  if (!adset.dynamicCreative) {
    opportunities.push({
      id: "dynamic-creative",
      title: "Criativo dinâmico recomendado",
      description: "Ativar criativo dinâmico ajuda o Meta a testar combinações automaticamente."
    });
  }

  if (payload.campaign.dailyBudgetBRL > 0 && payload.campaign.dailyBudgetBRL < LOW_BUDGET_THRESHOLD_BRL) {
    opportunities.push({
      id: "budget",
      title: "Orçamento abaixo do ideal",
      description: `Orçamentos diários abaixo de R$ ${LOW_BUDGET_THRESHOLD_BRL} tendem a limitar a fase de aprendizado.`
    });
  }

  return opportunities;
}
