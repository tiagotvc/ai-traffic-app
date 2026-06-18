const LAST_ADSET_PREFIX = "traffic-ai-last-adset:";

export function rememberAdset(
  metaCampaignId: string,
  adsetId: string,
  adsetName?: string | null
) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    `${LAST_ADSET_PREFIX}${metaCampaignId}`,
    JSON.stringify({ adsetId, adsetName: adsetName ?? null })
  );
}

export function getRememberedAdset(
  metaCampaignId: string
): { adsetId: string; adsetName?: string | null } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${LAST_ADSET_PREFIX}${metaCampaignId}`);
    if (!raw) return null;
    return JSON.parse(raw) as { adsetId: string; adsetName?: string | null };
  } catch {
    return null;
  }
}

export function clearRememberedAdset(metaCampaignId: string) {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(`${LAST_ADSET_PREFIX}${metaCampaignId}`);
}

export function campaignTabQuery(
  clientSlug: string,
  adsetId?: string | null,
  extra?: URLSearchParams | string
) {
  const q = new URLSearchParams();
  if (clientSlug) q.set("client", clientSlug);
  if (adsetId) q.set("adset", adsetId);
  if (extra) {
    const src =
      typeof extra === "string"
        ? new URLSearchParams(extra.startsWith("?") ? extra.slice(1) : extra)
        : extra;
    for (const key of ["period", "since", "until", "days"]) {
      const val = src.get(key);
      if (val) q.set(key, val);
    }
  }
  const qs = q.toString();
  return qs ? `?${qs}` : "";
}

export function campaignAdsHref(
  metaCampaignId: string,
  clientSlug: string,
  adsetId?: string | null
) {
  return `/campaigns/${metaCampaignId}/ads${campaignTabQuery(clientSlug, adsetId)}`;
}
