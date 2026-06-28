import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { getCachedMetaAssets, setCachedMetaAssets } from "@/lib/meta-assets-cache";
import { getInventoryMap } from "@/lib/meta-ad-accounts";
import { listTenantInventory } from "@/lib/meta-discover";
import {
  resolveInstagramForAdAccount,
  resolvePagesForAdAccount,
  resolveWhatsappForPages
} from "@/lib/meta-publish-assets";
import {
  fetchAdImages,
  fetchAdVideos,
  fetchAdAccountPixels,
  fetchCustomConversions,
  STANDARD_CONVERSION_EVENTS
} from "@/lib/meta-graph";

/**
 * Stable comparison tokens for a Meta CDN URL: the path (host + query stripped) and
 * the leading numeric id of the filename (the underlying photo/object id). Used to
 * match a video thumbnail against the auto-generated ad image of the same media.
 */
function metaCdnTokens(url?: string | null): string[] {
  if (!url) return [];
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return [];
  }
  const tokens = [`path:${pathname}`];
  const file = pathname.split("/").pop() ?? "";
  const leadingId = file.match(/^(\d{6,})/)?.[1];
  if (leadingId) tokens.push(`id:${leadingId}`);
  return tokens;
}

async function validateClientAdAccount(
  tenantId: string,
  clientSlug: string,
  adAccountId: string
): Promise<
  | { ok: true; clientId: string }
  | { ok: false; error: string; errorCode?: string; status: number }
> {
  const client = await getClientBySlugOrId(tenantId, clientSlug);
  if (!client) return { ok: false, error: "Cliente não encontrado", status: 404 };

  const { adAccount: adAccountRepo } = await repositories();
  const linked = await adAccountRepo.findOne({
    where: { clientId: client.id, metaAdAccountId: adAccountId }
  });
  if (!linked) {
    return {
      ok: false,
      error: "Conta não vinculada ao cliente",
      errorCode: "ACCOUNT_NOT_LINKED",
      status: 403
    };
  }
  return { ok: true, clientId: client.id };
}

export async function GET(req: Request) {
  const { tenant, metaAccessToken } = await getAppContext();
  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId")?.trim();
  const adAccountId = url.searchParams.get("adAccountId")?.trim();

  if (!clientId || !adAccountId) {
    return NextResponse.json(
      { ok: false, error: "clientId e adAccountId são obrigatórios" },
      { status: 400 }
    );
  }

  const validation = await validateClientAdAccount(tenant.id, clientId, adAccountId);
  if (!validation.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: validation.error,
        errorCode: validation.errorCode
      },
      { status: validation.status }
    );
  }

  const cached = await getCachedMetaAssets<Record<string, unknown>>(tenant.id, adAccountId);
  if (cached) {
    return NextResponse.json({ ok: true, ...cached });
  }

  const inv = await getInventoryMap(tenant.id);
  const bmFilter = inv.get(adAccountId)?.metaBusinessId ?? undefined;

  const adAccounts = await listTenantInventory(tenant.id, bmFilter);
  const pages = await resolvePagesForAdAccount({
    tenantId: tenant.id,
    adAccountId,
    metaAccessToken
  });

  let pixels: Array<{ id: string; name: string }> = [];
  let instagramAccounts: Array<{ id: string; username: string }> = [];
  let whatsappNumbers: Array<{
    pageId: string;
    phone: string;
    waMeUrl: string;
    isBusiness?: boolean;
  }> = [];
  let assets: Array<{ id: string; label: string; url?: string | null; kind: "image" | "video" }> = [];

  let customConversions: Array<{ id: string; label: string; eventType?: string }> = [];

  if (metaAccessToken) {
    const [pixelRows, igRows, imageRows, videoRows, conversionRows, waRows] = await Promise.all([
      fetchAdAccountPixels(metaAccessToken, adAccountId),
      resolveInstagramForAdAccount({ metaAccessToken, adAccountId, pages }),
      fetchAdImages(metaAccessToken, adAccountId),
      fetchAdVideos(metaAccessToken, adAccountId),
      fetchCustomConversions(metaAccessToken, adAccountId),
      resolveWhatsappForPages({ metaAccessToken, pages })
    ]);
    pixels = pixelRows.map((p) => ({ id: p.id, name: p.name?.trim() || p.id }));
    instagramAccounts = igRows;
    whatsappNumbers = waRows;

    // Meta auto-generates ad images from uploaded videos (thumbnails) that pollute
    // the image library. Drop any ad image that shares a CDN path or photo id with a
    // video thumbnail so the image picker only shows real image creatives.
    const videoThumbTokens = new Set<string>();
    for (const vid of videoRows) {
      for (const token of metaCdnTokens(vid.picture)) videoThumbTokens.add(token);
    }

    const imageAssets = imageRows
      .filter((img) => !!img.hash)
      .filter((img) => {
        const tokens = metaCdnTokens(img.url);
        return !tokens.some((token) => videoThumbTokens.has(token));
      })
      .map((img) => ({
        id: img.hash as string,
        label: img.name?.trim() || (img.hash as string),
        url: img.url ?? null,
        kind: "image" as const
      }));
    const videoAssets = videoRows.map((vid) => ({
      id: vid.id,
      label: vid.title?.trim() || vid.id,
      url: vid.picture ?? vid.source ?? null,
      kind: "video" as const
    }));
    assets = [...imageAssets, ...videoAssets];
    customConversions = [
      ...STANDARD_CONVERSION_EVENTS.map((eventType) => ({
        id: `std:${eventType}`,
        label: eventType,
        eventType
      })),
      ...conversionRows.map((c) => ({
        id: c.id,
        label: c.name?.trim() || c.id,
        eventType: c.custom_event_type
      }))
    ];
  }

  const payload = {
    adAccounts,
    pages,
    pixels,
    instagramAccounts,
    whatsappNumbers,
    assets,
    customConversions
  };

  // Only cache once the Meta token resolved real data — never cache empty results.
  if (metaAccessToken) {
    await setCachedMetaAssets(tenant.id, adAccountId, payload);
  }

  return NextResponse.json({ ok: true, ...payload });
}
