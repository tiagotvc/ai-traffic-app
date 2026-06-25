"use client";

import { useTranslations } from "next-intl";

import { ObjectiveSelector } from "@/components/campaign-creator/ObjectiveSelector";
import { useCampaignDraft } from "@/components/campaign-creator/CampaignDraftContext";
import type { CampaignObjectiveKey } from "@/lib/campaign-draft";
import {
  defaultConversionEventForObjective,
  defaultConversionLocationForObjective
} from "@/lib/campaign-draft";
import { UxFormCard } from "@/uxpilot-ui/adapters/ux-wizard-primitives";

/** Step 1 do criador UX Pilot — seleção de objetivo inline no stepper (não modal). */
export function ObjectiveStep() {
  const t = useTranslations("campaignCreator");
  const { payload, updatePayload, setObjectiveChosen, setActiveNode } = useCampaignDraft();

  function select(obj: CampaignObjectiveKey) {
    const nameKey = `defaultName_${obj}` as const;
    const adsetKey = `defaultAdset_${obj}` as const;
    const adKey = `defaultAd_${obj}` as const;
    updatePayload((p) => ({
      ...p,
      objective: obj,
      campaign: {
        ...p.campaign,
        name:
          p.campaign.name.startsWith("Nova") || p.campaign.name.startsWith("New")
            ? t(nameKey)
            : p.campaign.name
      },
      adsets: p.adsets.map((a, i) =>
        i === 0
          ? {
              ...a,
              name: a.name.startsWith("Novo") || a.name.startsWith("New") ? t(adsetKey) : a.name,
              conversionLocation: defaultConversionLocationForObjective(obj),
              conversionEvent: defaultConversionEventForObjective(obj)
            }
          : a
      ),
      ads: p.ads.map((a, i) =>
        i === 0
          ? {
              ...a,
              name: a.name.startsWith("Novo") || a.name.startsWith("New") ? t(adKey) : a.name
            }
          : a
      )
    }));
    setObjectiveChosen(true);
    setActiveNode("campaign");
  }

  return (
    <UxFormCard>
      <ObjectiveSelector
        buyingType={payload.buyingType}
        objective={payload.objective}
        onBuyingTypeChange={(bt) => updatePayload({ buyingType: bt })}
        onObjectiveChange={select}
      />
    </UxFormCard>
  );
}
