"use client";

import { useTranslations } from "next-intl";

import { ObjectiveSelector } from "@/components/campaign-creator/ObjectiveSelector";
import { useCampaignDraft } from "@/components/campaign-creator/CampaignDraftContext";
import type { BuyingType, CampaignObjectiveKey } from "@/lib/campaign-draft";
import { applyObjectiveDefaultNames } from "@/lib/campaign-draft-i18n";
import { UxWizardStepContent } from "@/uxpilot-ui/adapters/ux-wizard-primitives";

/** Step 1 do criador UX Pilot — seleção de objetivo inline (avanço só pelo rodapé). */
export function ObjectiveStep() {
  const t = useTranslations("campaignCreator");
  const { payload, updatePayload } = useCampaignDraft();

  function applyObjective(obj: CampaignObjectiveKey) {
    updatePayload((p) =>
      applyObjectiveDefaultNames(p, obj, (key) => t(key as Parameters<typeof t>[0]))
    );
  }

  function applyBuyingType(bt: BuyingType) {
    updatePayload({ buyingType: bt });
  }

  return (
    <UxWizardStepContent>
      <ObjectiveSelector
        buyingType={payload.buyingType}
        objective={payload.objective}
        onBuyingTypeChange={applyBuyingType}
        onObjectiveChange={applyObjective}
        showHeader={false}
      />
    </UxWizardStepContent>
  );
}
