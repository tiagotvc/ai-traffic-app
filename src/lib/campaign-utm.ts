export type UtmFields = {
  source: string;
  medium: string;
  campaign: string;
  content: string;
  term: string;
};

export const defaultUtm = (): UtmFields => ({
  source: "facebook",
  medium: "paid",
  campaign: "",
  content: "",
  term: ""
});

export type UtmTokenContext = {
  campaignName: string;
  adsetName: string;
  adName: string;
};

/** Meta dynamic URL parameters (Ads Manager → URL parameters). */
export const META_URL_DYNAMIC_PARAMS = [
  { token: "{{campaign.name}}", labelKey: "utmTokenCampaignName" },
  { token: "{{campaign.id}}", labelKey: "utmTokenCampaignId" },
  { token: "{{adset.name}}", labelKey: "utmTokenAdsetName" },
  { token: "{{adset.id}}", labelKey: "utmTokenAdsetId" },
  { token: "{{ad.name}}", labelKey: "utmTokenAdName" },
  { token: "{{ad.id}}", labelKey: "utmTokenAdId" },
  { token: "{{placement}}", labelKey: "utmTokenPlacement" },
  { token: "{{site_source_name}}", labelKey: "utmTokenSiteSource" }
] as const;

export function resolveUtmTokens(value: string, ctx: UtmTokenContext): string {
  return value
    .replace(/\{\{campaign\.name\}\}/gi, ctx.campaignName)
    .replace(/\{\{adset\.name\}\}/gi, ctx.adsetName)
    .replace(/\{\{ad\.name\}\}/gi, ctx.adName);
}

/** Leaves Meta {{…}} tokens intact; only resolves legacy underscore aliases at publish preview. */
export function containsMetaDynamicToken(value: string): boolean {
  return /\{\{[a-z_.]+\}\}/i.test(value);
}

export function utmToQueryString(utm: UtmFields, ctx: UtmTokenContext): string {
  const pairs: string[] = [];
  const entries: Array<[keyof UtmFields, string]> = [
    ["source", utm.source],
    ["medium", utm.medium],
    ["campaign", utm.campaign],
    ["content", utm.content],
    ["term", utm.term]
  ];
  for (const [key, raw] of entries) {
    const val = resolveUtmTokens(raw.trim(), ctx);
    if (val) pairs.push(`utm_${key}=${encodeURIComponent(val)}`);
  }
  return pairs.join("&");
}

export function mergeUrlWithParams(baseUrl: string, queryString: string): string {
  if (!queryString.trim()) return baseUrl;
  const sep = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${sep}${queryString}`;
}

export function composeAdLinkUrl(
  baseUrl: string,
  utm: UtmFields,
  urlParamsOverride: string,
  ctx: UtmTokenContext
): string {
  const utmQs = utmToQueryString(utm, ctx);
  const override = urlParamsOverride.trim();
  const qs = override || utmQs;
  return mergeUrlWithParams(baseUrl, qs);
}
