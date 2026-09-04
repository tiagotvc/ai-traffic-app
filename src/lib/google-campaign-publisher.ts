import "server-only";
import type { GoogleSearchCampaignDraft } from "@/lib/google-campaign-draft";
import { GOOGLE_ADS_BASE, GoogleAdsApiError, baseHeaders, parseError } from "@/lib/google-ads-api";
import { getGoogleAdsLoginCustomerId } from "@/lib/google-env";

type MutateOperation = Record<string, unknown>;
const digits = (value: string) => value.replace(/\D/g, "");
const micros = (value: number) => String(Math.round(value * 1_000_000));

export function buildGoogleSearchCampaignOperations(draft: GoogleSearchCampaignDraft): MutateOperation[] {
  const cid = digits(draft.customerId);
  const resource = (path: string) => `customers/${cid}/${path}`;
  let temporaryId = -1;
  const nextId = () => temporaryId--;
  const budgetName = resource(`campaignBudgets/${nextId()}`);
  const campaignName = resource(`campaigns/${nextId()}`);
  const operations: MutateOperation[] = [{ campaignBudgetOperation: { create: { resourceName: budgetName, name: `${draft.campaign.name} — orçamento`, amountMicros: micros(draft.campaign.dailyBudgetBRL), explicitlyShared: false } } }];
  const bidding = draft.campaign.bidding.strategy === "maximize_conversions" ? { maximizeConversions: draft.campaign.bidding.targetCpaBRL ? { targetCpaMicros: micros(draft.campaign.bidding.targetCpaBRL) } : {} }
    : draft.campaign.bidding.strategy === "maximize_conversion_value" ? { maximizeConversionValue: draft.campaign.bidding.targetRoas ? { targetRoas: draft.campaign.bidding.targetRoas } : {} }
      : draft.campaign.bidding.strategy === "manual_cpc" ? { manualCpc: { enhancedCpcEnabled: false } }
        : { targetSpend: draft.campaign.bidding.maxCpcBRL ? { cpcBidCeilingMicros: micros(draft.campaign.bidding.maxCpcBRL) } : {} };
  operations.push({ campaignOperation: { create: { resourceName: campaignName, name: draft.campaign.name, status: "PAUSED", advertisingChannelType: "SEARCH", campaignBudget: budgetName, networkSettings: { targetGoogleSearch: true, targetSearchNetwork: draft.campaign.searchPartners, targetContentNetwork: draft.campaign.displayExpansion, targetPartnerSearchNetwork: false }, geoTargetTypeSetting: { positiveGeoTargetType: draft.campaign.locationPresence === "presence" ? "PRESENCE" : "PRESENCE_OR_INTEREST", negativeGeoTargetType: "PRESENCE" }, ...bidding, ...(draft.campaign.startDate ? { startDate: draft.campaign.startDate.replaceAll("-", "") } : {}), ...(draft.campaign.endDate ? { endDate: draft.campaign.endDate.replaceAll("-", "") } : {}) } } });
  for (const location of draft.campaign.locations) {
    if (location.type === "proximity" && location.latitude != null && location.longitude != null && location.radiusKm != null) {
      operations.push({ campaignCriterionOperation: { create: { campaign: campaignName, proximity: { geoPoint: { latitudeInMicroDegrees: Math.round(location.latitude * 1_000_000), longitudeInMicroDegrees: Math.round(location.longitude * 1_000_000) }, radius: location.radiusKm, radiusUnits: "KILOMETERS" } } } });
    } else if (/^\d+$/.test(location.id)) {
      operations.push({ campaignCriterionOperation: { create: { campaign: campaignName, location: { geoTargetConstant: `geoTargetConstants/${location.id}` } } } });
    }
  }
  for (const location of draft.campaign.excludedLocations) if (/^\d+$/.test(location.id)) operations.push({ campaignCriterionOperation: { create: { campaign: campaignName, negative: true, location: { geoTargetConstant: `geoTargetConstants/${location.id}` } } } });
  for (const languageId of draft.campaign.languageIds) operations.push({ campaignCriterionOperation: { create: { campaign: campaignName, language: { languageConstant: `languageConstants/${digits(languageId)}` } } } });
  for (const keyword of draft.campaign.negativeKeywords.filter((item) => item.text.trim())) operations.push({ campaignCriterionOperation: { create: { campaign: campaignName, negative: true, keyword: { text: keyword.text.trim(), matchType: keyword.matchType } } } });
  for (const group of draft.adGroups) {
    const groupName = resource(`adGroups/${nextId()}`);
    operations.push({ adGroupOperation: { create: { resourceName: groupName, campaign: campaignName, name: group.name, status: "PAUSED", type: "SEARCH_STANDARD", ...(draft.campaign.bidding.strategy === "manual_cpc" ? { cpcBidMicros: micros(group.defaultCpcBRL ?? draft.campaign.bidding.maxCpcBRL ?? 1) } : {}) } } });
    for (const keyword of group.keywords.filter((item) => item.text.trim())) operations.push({ adGroupCriterionOperation: { create: { adGroup: groupName, status: "ENABLED", keyword: { text: keyword.text.trim(), matchType: keyword.matchType }, negative: false } } });
    for (const ad of group.ads) operations.push({ adGroupAdOperation: { create: { adGroup: groupName, status: "PAUSED", ad: { finalUrls: [ad.finalUrl], ...(ad.path1 ? { displayUrl: undefined } : {}), responsiveSearchAd: { headlines: ad.headlines.filter(Boolean).map((text) => ({ text })), descriptions: ad.descriptions.filter(Boolean).map((text) => ({ text })), path1: ad.path1 || undefined, path2: ad.path2 || undefined } } } } });
  }
  return operations;
}

export async function mutateGoogleSearchCampaign(input: { accessToken: string; draft: GoogleSearchCampaignDraft; validateOnly: boolean; loginCustomerId?: string }) {
  const cid = digits(input.draft.customerId);
  const response = await fetch(`${GOOGLE_ADS_BASE}/customers/${cid}/googleAds:mutate`, { method: "POST", headers: baseHeaders(input.accessToken, input.loginCustomerId || getGoogleAdsLoginCustomerId() || cid), body: JSON.stringify({ mutateOperations: buildGoogleSearchCampaignOperations(input.draft), validateOnly: input.validateOnly, partialFailure: false, responseContentType: "MUTABLE_RESOURCE" }) });
  if (!response.ok) throw new GoogleAdsApiError(await parseError(response), response.status);
  return response.json();
}
