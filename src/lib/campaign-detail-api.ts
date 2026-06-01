import "server-only";

import type { CampaignDetailHints } from "@/lib/campaign-detail-query";
import { getTenantMetaAccessToken } from "@/lib/meta-auth-store";

export async function resolveMetaTokensForApi(
  tenantId: string,
  userId: string,
  metaAccessToken?: string | null
) {
  const fallbackMetaToken = await getTenantMetaAccessToken(tenantId, userId);
  const primary = metaAccessToken ?? fallbackMetaToken;
  return {
    metaAccessToken: primary,
    fallbackMetaToken:
      fallbackMetaToken && fallbackMetaToken !== primary ? fallbackMetaToken : undefined
  };
}

export function parseCampaignDetailHints(url: URL): CampaignDetailHints {
  const num = (key: string) => {
    const v = Number(url.searchParams.get(key));
    return Number.isFinite(v) ? v : undefined;
  };
  const cpaRaw = url.searchParams.get("cpa");
  return {
    metaAdAccountId: url.searchParams.get("metaAdAccountId")?.trim() || undefined,
    clientSlug: url.searchParams.get("clientSlug")?.trim() || undefined,
    campaignName: url.searchParams.get("campaignName")?.trim() || undefined,
    status: url.searchParams.get("status")?.trim() || undefined,
    objective: url.searchParams.get("objective")?.trim() || undefined,
    spend: num("spend"),
    conversions: num("conversions"),
    leads: num("leads"),
    roas: num("roas"),
    cpa: cpaRaw != null && cpaRaw !== "" ? Number(cpaRaw) : undefined
  };
}
