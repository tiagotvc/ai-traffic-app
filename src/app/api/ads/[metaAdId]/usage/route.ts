import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { getAppContext, slugify } from "@/lib/app-context";
import { getAllTenantMetaTokens } from "@/lib/meta-auth-store";
import { fetchAdRef } from "@/lib/meta-graph";
import { fetchAdsForAccountAnyToken } from "@/lib/creatives-data";

export const maxDuration = 30;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ metaAdId: string }> }
) {
  const { metaAdId } = await params;
  const { tenant, metaAccessToken: ctxToken } = await getAppContext();
  const tokens = await getAllTenantMetaTokens(tenant.id, ctxToken);
  if (!tokens.length) return NextResponse.json({ ok: true, campaigns: [], clientSlug: "" });

  let ref = { accountId: null as string | null, creativeId: null as string | null };
  for (const token of tokens) {
    ref = await fetchAdRef(token, metaAdId);
    if (ref.accountId && ref.creativeId) break;
  }
  if (!ref.accountId || !ref.creativeId) {
    return NextResponse.json({ ok: true, campaigns: [], clientSlug: "" });
  }

  const { ads } = await fetchAdsForAccountAnyToken(tokens, ref.accountId);
  const used = ads.filter((a) => a.creativeId && a.creativeId === ref.creativeId);

  // slug do cliente (para os links) a partir da conta de anúncio.
  const accountNoPrefix = ref.accountId.replace(/^act_/, "");
  const { adAccount: adAccountRepo, client: clientRepo } = await repositories();
  const accountRow =
    (await adAccountRepo.findOne({ where: { metaAdAccountId: `act_${accountNoPrefix}` } })) ??
    (await adAccountRepo.findOne({ where: { metaAdAccountId: accountNoPrefix } }));
  let clientSlug = "";
  if (accountRow?.clientId) {
    const client = await clientRepo.findOne({ where: { id: accountRow.clientId } });
    if (client) clientSlug = slugify(client.name);
  }

  type AdItem = { id: string; name: string; status: string | null };
  type Adset = { id: string | null; name: string; ads: AdItem[] };
  type Campaign = { id: string; name: string; adsets: Map<string, Adset> };
  const campMap = new Map<string, Campaign>();

  for (const a of used) {
    if (!a.campaignId) continue;
    let camp = campMap.get(a.campaignId);
    if (!camp) {
      camp = { id: a.campaignId, name: a.campaignName ?? a.campaignId, adsets: new Map() };
      campMap.set(a.campaignId, camp);
    }
    const asKey = a.adsetId ?? "—";
    let adset = camp.adsets.get(asKey);
    if (!adset) {
      adset = { id: a.adsetId ?? null, name: a.adsetName ?? "—", ads: [] };
      camp.adsets.set(asKey, adset);
    }
    adset.ads.push({ id: a.id, name: a.name ?? a.id, status: a.status ?? null });
  }

  const campaigns = [...campMap.values()].map((c) => ({
    id: c.id,
    name: c.name,
    adsets: [...c.adsets.values()]
  }));

  return NextResponse.json({ ok: true, campaigns, clientSlug });
}
