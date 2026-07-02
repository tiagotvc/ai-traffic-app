"use client";

import { LegacyCampaignMobileSummary } from "@/components/campaign-creator/LegacyCampaignSummary";
import { useCommanderAccess } from "@/hooks/useCommanderAccess";

/** Compatibilidade com os steps existentes; o antigo resumo agora hospeda o Commander. */
export function CampaignCreatorUxMobileSummary() {
  const { commander } = useCommanderAccess();
  // O Commander fica no rodapé persistente do criador. Mantemos aqui apenas o
  // resumo legado para planos que ainda não têm acesso ao novo assistente.
  return commander ? null : <LegacyCampaignMobileSummary />;
}
