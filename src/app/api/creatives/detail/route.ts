import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { getAppContext, slugify } from "@/lib/app-context";
import { getAllTenantMetaTokens } from "@/lib/meta-auth-store";
import { fetchAdsForAccountAnyToken } from "@/lib/creatives-data";
import { resolveMetaTokensForApi } from "@/lib/campaign-detail-api";
import {
  fetchAdCreativeCopy,
  fetchAdPreview,
  fetchAdRef,
  fetchAdsetPlacementInfo,
  type AdCreativeCopy
} from "@/lib/meta-graph";

export const maxDuration = 45;

function copySignature(copy: AdCreativeCopy): string {
  return JSON.stringify({
    bodies: copy.bodies,
    titles: copy.titles,
    descriptions: copy.descriptions,
    ctas: copy.ctas
  });
}

function mergeCopy(a: AdCreativeCopy, b: AdCreativeCopy): AdCreativeCopy {
  const uniq = (arr: string[]) => [...new Set(arr.filter(Boolean))];
  return {
    bodies: uniq([...a.bodies, ...b.bodies]),
    titles: uniq([...a.titles, ...b.titles]),
    descriptions: uniq([...a.descriptions, ...b.descriptions]),
    ctas: uniq([...a.ctas, ...b.ctas])
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const adIdsParam = url.searchParams.get("adIds")?.trim();
  const singleAdId = url.searchParams.get("adId")?.trim();
  const adIds = (adIdsParam ? adIdsParam.split(",") : singleAdId ? [singleAdId] : [])
    .map((id) => id.trim())
    .filter(Boolean);

  if (!adIds.length) {
    return NextResponse.json({ ok: false, error: "adIds obrigatório" }, { status: 400 });
  }

  const { tenant, user, metaAccessToken: ctxToken } = await getAppContext();
  const { metaAccessToken, fallbackMetaToken } = await resolveMetaTokensForApi(
    tenant.id,
    user.id,
    ctxToken
  );
  const tokens = await getAllTenantMetaTokens(tenant.id, ctxToken);
  const tryTokens = [metaAccessToken, fallbackMetaToken, ...tokens].filter(
    (t, i, arr): t is string => !!t && arr.indexOf(t) === i
  );

  let accountId: string | null = null;
  let creativeId: string | null = null;
  for (const token of tryTokens) {
    const ref = await fetchAdRef(token, adIds[0]!);
    if (ref.accountId) {
      accountId = ref.accountId;
      creativeId = ref.creativeId;
      break;
    }
  }

  if (!accountId) {
    return NextResponse.json({ ok: false, error: "Anúncio não encontrado" }, { status: 404 });
  }

  let ads: Awaited<ReturnType<typeof fetchAdsForAccountAnyToken>>["ads"] = [];
  for (const token of tryTokens) {
    const result = await fetchAdsForAccountAnyToken([token], accountId);
    if (result.ok && result.ads.length) {
      ads = result.ads;
      break;
    }
  }

  const adIdSet = new Set(adIds);
  let relevant = ads.filter((a) => adIdSet.has(a.id));
  if (!relevant.length) {
    relevant = ads.filter((a) => creativeId && a.creativeId === creativeId);
  }
  if (!relevant.length && adIds.length) {
    relevant = adIds.map((id) => ({ id, name: id }));
  }

  const copiesByCampaign: Array<{
    campaignId: string;
    campaignName: string;
    adsetName: string;
    adId: string;
    copy: AdCreativeCopy;
  }> = [];

  const campaignMap = new Map<
    string,
    { campaignId: string; campaignName: string; adsetName: string; copies: Map<string, AdCreativeCopy> }
  >();

  for (const ad of relevant) {
    let copy: AdCreativeCopy = { bodies: [], titles: [], descriptions: [], ctas: [] };
    for (const token of tryTokens) {
      copy = await fetchAdCreativeCopy(token, ad.id);
      if (copy.bodies.length || copy.titles.length || copy.descriptions.length || copy.ctas.length) {
        break;
      }
    }

    const campaignId = ad.campaignId ?? "unknown";
    const campaignName = ad.campaignName ?? campaignId;
    const adsetName = ad.adsetName ?? "—";
    const sig = copySignature(copy);

    let group = campaignMap.get(campaignId);
    if (!group) {
      group = { campaignId, campaignName, adsetName, copies: new Map() };
      campaignMap.set(campaignId, group);
    }
    if (!group.copies.has(sig)) {
      group.copies.set(sig, copy);
      copiesByCampaign.push({
        campaignId,
        campaignName,
        adsetName,
        adId: ad.id,
        copy
      });
    }
  }

  const uniqueAdsetIds = [...new Set(relevant.map((a) => a.adsetId).filter(Boolean))] as string[];
  const placements: Array<{
    adsetId: string;
    adsetName: string;
    campaignName: string;
    platforms: string[];
    positions: string[];
  }> = [];

  for (const adsetId of uniqueAdsetIds.slice(0, 12)) {
    const ad = relevant.find((a) => a.adsetId === adsetId);
    for (const token of tryTokens) {
      const info = await fetchAdsetPlacementInfo(
        token,
        adsetId,
        ad?.campaignName ?? "",
        ad?.adsetName ?? ""
      );
      if (info.platforms.length || info.positions.length) {
        placements.push(info);
        break;
      }
    }
  }

  let previewAdId: string | null = null;
  let preview: { src: string; width: number | null; height: number | null } | null = null;
  const format = url.searchParams.get("format") || "MOBILE_FEED_STANDARD";
  const previewCandidates = [
    ...relevant.filter((a) => a.status === "ACTIVE").map((a) => a.id),
    ...relevant.map((a) => a.id)
  ];
  const seenPreview = new Set<string>();
  for (const candidateId of previewCandidates) {
    if (seenPreview.has(candidateId)) continue;
    seenPreview.add(candidateId);
    for (const token of tryTokens) {
      const p = await fetchAdPreview(token, candidateId, format);
      if (p) {
        previewAdId = candidateId;
        preview = p;
        break;
      }
    }
    if (preview) break;
  }

  const accountNoPrefix = accountId.replace(/^act_/, "");
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

  for (const a of relevant) {
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
    if (!adset.ads.some((x) => x.id === a.id)) {
      adset.ads.push({ id: a.id, name: a.name ?? a.id, status: a.status ?? null });
    }
  }

  const campaigns = [...campMap.values()].map((c) => ({
    id: c.id,
    name: c.name,
    adsets: [...c.adsets.values()]
  }));

  const mergedCopy = copiesByCampaign.reduce(
    (acc, row) => mergeCopy(acc, row.copy),
    { bodies: [], titles: [], descriptions: [], ctas: [] } as AdCreativeCopy
  );

  return NextResponse.json({
    ok: true,
    previewAdId,
    preview,
    copy: mergedCopy,
    copiesByCampaign,
    placements,
    campaigns,
    clientSlug,
    creativeId
  });
}
