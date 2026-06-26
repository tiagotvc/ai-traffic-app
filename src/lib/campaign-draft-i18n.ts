import type { CampaignDraftPayload, CampaignObjectiveKey } from "@/lib/campaign-draft";

export function isDefaultCampaignName(name: string): boolean {
  if (!name.trim()) return false;
  if (name === "Nova campanha" || name === "New Campaign") return true;
  if (name.startsWith("Nova campanha de")) return true;
  return /^New .+ Campaign$/i.test(name);
}

export function isDefaultAdsetName(name: string): boolean {
  if (!name.trim()) return false;
  if (name === "Novo conjunto de anúncios" || name === "New Ad Set") return true;
  if (name.startsWith("Novo conjunto de")) return true;
  return /^New .+ Ad Set$/i.test(name);
}

export function isDefaultAdName(name: string): boolean {
  if (!name.trim()) return false;
  if (name === "Novo anúncio" || name === "New Ad") return true;
  if (name.startsWith("Novo anúncio de")) return true;
  return /^New .+ Ad$/i.test(name);
}

export function draftFallbackName(locale: string): string {
  return locale === "en" ? "Draft" : "Rascunho";
}

type CampaignCreatorTranslate = (
  key:
    | `defaultName_${CampaignObjectiveKey}`
    | `defaultAdset_${CampaignObjectiveKey}`
    | `defaultAd_${CampaignObjectiveKey}`
    | "defaultAdsetGeneric"
    | "defaultAdGeneric"
) => string;

export function applyObjectiveDefaultNames(
  payload: CampaignDraftPayload,
  objective: CampaignObjectiveKey,
  t: CampaignCreatorTranslate
): CampaignDraftPayload {
  const nameKey = `defaultName_${objective}` as const;
  const adsetKey = `defaultAdset_${objective}` as const;
  const adKey = `defaultAd_${objective}` as const;

  return {
    ...payload,
    objective,
    campaign: {
      ...payload.campaign,
      name: isDefaultCampaignName(payload.campaign.name) ? t(nameKey) : payload.campaign.name
    },
    adsets: payload.adsets.map((adset, index) =>
      index === 0 && isDefaultAdsetName(adset.name) ? { ...adset, name: t(adsetKey) } : adset
    ),
    ads: payload.ads.map((ad, index) =>
      index === 0 && isDefaultAdName(ad.name) ? { ...ad, name: t(adKey) } : ad
    )
  };
}

export function relocalizeDraftDefaultNames(
  payload: CampaignDraftPayload,
  t: CampaignCreatorTranslate
): CampaignDraftPayload {
  const objective = payload.objective;
  const nameKey = `defaultName_${objective}` as const;
  const adsetKey = `defaultAdset_${objective}` as const;
  const adKey = `defaultAd_${objective}` as const;

  return {
    ...payload,
    campaign: {
      ...payload.campaign,
      name: isDefaultCampaignName(payload.campaign.name) ? t(nameKey) : payload.campaign.name
    },
    adsets: payload.adsets.map((adset, index) => {
      if (!isDefaultAdsetName(adset.name)) return adset;
      return {
        ...adset,
        name: index === 0 ? t(adsetKey) : t("defaultAdsetGeneric")
      };
    }),
    ads: payload.ads.map((ad, index) => {
      if (!isDefaultAdName(ad.name)) return ad;
      return {
        ...ad,
        name: index === 0 ? t(adKey) : t("defaultAdGeneric")
      };
    })
  };
}
