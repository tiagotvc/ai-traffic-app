import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { validateClientAdAccount } from "@/lib/audience-api-helpers";
import {
  ENGAGEMENT_ACTIONS,
  ENGAGEMENT_SOURCES,
  WEBSITE_MAX_RETENTION_DAYS,
  WEBSITE_PIXEL_EVENTS,
  fetchAdAccountApps,
  fetchEngagementLeadForms,
  fetchEngagementVideoOptions
} from "@/lib/meta-audience-create";
import {
  fetchAdAccountPixels,
  fetchCustomConversions,
  STANDARD_CONVERSION_EVENTS
} from "@/lib/meta-graph";
import {
  resolveInstagramForAdAccount,
  resolvePagesForAdAccount
} from "@/lib/meta-publish-assets";

export async function GET(req: Request) {
  const { tenant, metaAccessToken } = await getAppContext();
  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId")?.trim();
  const adAccountId = url.searchParams.get("adAccountId")?.trim();
  const type = url.searchParams.get("type")?.trim();

  if (!clientId || !adAccountId) {
    return NextResponse.json(
      { ok: false, error: "clientId e adAccountId são obrigatórios" },
      { status: 400 }
    );
  }

  const validation = await validateClientAdAccount(tenant.id, clientId, adAccountId);
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: validation.status });
  }

  if (!metaAccessToken) {
    return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
  }

  const publishPages = await resolvePagesForAdAccount({
    tenantId: tenant.id,
    adAccountId,
    metaAccessToken
  });
  const pages = publishPages.map((p) => ({ id: p.metaPageId, name: p.name }));

  const [pixels, customConversions, apps, instagramAccounts] = await Promise.all([
    fetchAdAccountPixels(metaAccessToken, adAccountId),
    fetchCustomConversions(metaAccessToken, adAccountId),
    fetchAdAccountApps(metaAccessToken, adAccountId),
    resolveInstagramForAdAccount({ metaAccessToken, adAccountId, pages: publishPages })
  ]);

  const websiteEvents = [
    ...WEBSITE_PIXEL_EVENTS,
    ...customConversions.map((c) => ({
      id: `custom:${c.id}`,
      labelKey: c.name ?? c.id,
      metaEvent: c.custom_event_type ?? c.name ?? c.id,
      isCustom: true
    }))
  ];

  const payload: Record<string, unknown> = {
    pixels: pixels.map((p) => ({ id: p.id, name: p.name?.trim() || p.id })),
    pages,
    instagramAccounts: instagramAccounts.map((i) => ({
      id: i.id,
      name: i.username
    })),
    apps: apps.map((a) => ({ id: a.id, name: a.name?.trim() || a.id })),
    websiteEvents,
    standardEvents: STANDARD_CONVERSION_EVENTS,
    websiteMaxRetentionDays: WEBSITE_MAX_RETENTION_DAYS,
    engagementSources: ENGAGEMENT_SOURCES,
    engagementActions: ENGAGEMENT_ACTIONS
  };

  if (type === "website") {
    return NextResponse.json({ ok: true, ...payload, websiteEvents });
  }
  if (type === "engagement") {
    const igForOptions = instagramAccounts.map((i) => ({
      id: i.id,
      name: i.username
    }));
    const [engagementVideos, leadForms] = await Promise.all([
      fetchEngagementVideoOptions(metaAccessToken, adAccountId, pages, igForOptions),
      fetchEngagementLeadForms(metaAccessToken, pages)
    ]);
    return NextResponse.json({
      ok: true,
      pages,
      instagramAccounts: payload.instagramAccounts,
      engagementVideos,
      leadForms,
      engagementSources: ENGAGEMENT_SOURCES,
      engagementActions: ENGAGEMENT_ACTIONS
    });
  }

  return NextResponse.json({ ok: true, ...payload });
}
