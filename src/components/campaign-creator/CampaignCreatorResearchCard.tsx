"use client";

import { useCampaignDraft } from "@/components/campaign-creator/CampaignDraftContext";
import { ResearchPipelineCard } from "@/components/labs/ResearchPipelineCard";
import { usePlatformFeature } from "@/hooks/usePlatformFeature";
import { resolveDraftClient } from "@/lib/campaign-draft-client";
import {
  campaignPipelineRunSignature,
  getCampaignWizardPipelineConfig
} from "@/lib/campaign-creator/campaign-pipeline-steps";

/**
 * Card de pesquisa dos cientistas no criador de campanha.
 * Pipeline step-aware: roda só os cientistas do passo atual; concorrentes ficam em cache.
 */
export function CampaignCreatorResearchCard() {
  const researchEnabled = usePlatformFeature("campaigns.brain.research");
  const { payload, clients, activeNode, draftId } = useCampaignDraft();
  const client = resolveDraftClient(payload.clientSlug, clients);
  const shellSignature = client ? `${client.id}|${payload.objective}` : null;
  const runSignature = client
    ? campaignPipelineRunSignature({
        clientId: client.id,
        objective: payload.objective,
        activeNode,
        dailyBudgetBRL: payload.campaign.dailyBudgetBRL
      })
    : null;
  const pipelineConfig = getCampaignWizardPipelineConfig(activeNode);

  if (!researchEnabled) return null;
  if (!shellSignature || !runSignature) return null;

  return (
    <div className="campaign-creator-sidebar-card" data-orion-brain-research>
      <ResearchPipelineCard
        scope="campaign"
        signature={runSignature}
        shellSignature={shellSignature}
        title="Pesquisa Orion"
        dossierLabelKey={pipelineConfig.labelKey}
        requestBody={{
          clientSlug: payload.clientSlug,
          briefing: payload.objective,
          persistHypotheses: activeNode === "review",
          activeNode,
          draftId: draftId ?? undefined
        }}
      />
    </div>
  );
}
