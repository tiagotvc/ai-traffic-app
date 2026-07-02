"use client";

import { useCampaignDraft } from "@/components/campaign-creator/CampaignDraftContext";
import { ResearchPipelineCard } from "@/components/labs/ResearchPipelineCard";
import { useCommanderScientistsAccess } from "@/hooks/useCommanderScientistsAccess";
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
  const researchEnabled = useCommanderScientistsAccess("campaigns.commander.scientists.campaigns");
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
        title="Commander"
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
