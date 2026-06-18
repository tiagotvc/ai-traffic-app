import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import {
  getOrCreateClientMetaSettings,
  getResolvedClientMeta,
  patchClientMetaSettings
} from "@/lib/client-meta-settings";
import { repositories } from "@/db/repositories";
import { resolveClientMetaBusinessId } from "@/lib/client-meta-business";
import { resolvePagesForAdAccount } from "@/lib/meta-publish-assets";
import { listTenantPages } from "@/lib/meta-discover";
import { fetchUserPages } from "@/lib/meta-graph";

const PatchSchema = z.object({
  defaultAdAccountId: z.string().nullable().optional(),
  metaPageId: z.string().nullable().optional(),
  metaLinkUrl: z.string().nullable().optional(),
  metaPixelId: z.string().nullable().optional(),
  metaLeadFormId: z.string().nullable().optional(),
  instagramActorId: z.string().nullable().optional(),
  defaultObjective: z.enum(["leads", "sales", "traffic"]).optional(),
  defaultCta: z.string().optional(),
  defaultDailyBudgetBrl: z.number().nullable().optional(),
  targeting: z
    .object({
      countries: z.array(z.string()),
      age_min: z.number(),
      age_max: z.number(),
      languages: z.array(z.string()).optional()
    })
    .optional(),
  specialAdCategories: z.array(z.string()).optional(),
  campaignNamePrefix: z.string().nullable().optional(),
  syncEnabled: z.boolean().optional(),
  syncPriority: z.enum(["critical", "normal", "low"]).optional(),
  defaultCustomAudienceIds: z.array(z.string()).optional(),
  defaultExcludedAudienceIds: z.array(z.string()).optional(),
  automationEnabled: z.boolean().optional(),
  targetingTemplateName: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  // dashboard preferences
  defaultDashboardMetrics: z.array(z.string()).optional(),
  defaultClientMetric: z.string().nullable().optional(),
  defaultUtm: z
    .object({
      source: z.string().optional(),
      medium: z.string().optional(),
      campaign: z.string().optional(),
      content: z.string().optional(),
      term: z.string().optional()
    })
    .nullable()
    .optional()
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;
  const { tenant, metaAccessToken } = await getAppContext();
  const resolved = await getResolvedClientMeta(tenant.id, clientId);
  if (!resolved) {
    return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
  }

  const { clientTag: tagRepo, adAccount: adAccountRepo } = await repositories();
  const tags = await tagRepo.find({ where: { clientId: resolved.settings.clientId } });

  const client = await getClientBySlugOrId(tenant.id, clientId);
  const linked = client
    ? await adAccountRepo.find({ where: { clientId: client.id } })
    : [];
  const clientBm = client ? resolveClientMetaBusinessId(client, linked) : null;

  const primaryAdAccountId =
    resolved.settings.defaultAdAccountId?.trim() || linked[0]?.metaAdAccountId || null;

  let availablePages: Array<{ id: string; name: string; metaBusinessId?: string | null }> = [];

  if (primaryAdAccountId && metaAccessToken) {
    availablePages = (await resolvePagesForAdAccount({
      tenantId: tenant.id,
      adAccountId: primaryAdAccountId,
      metaAccessToken
    })).map((p) => ({
      id: p.metaPageId,
      name: p.name,
      metaBusinessId: null
    }));
  }

  if (!availablePages.length) {
    availablePages = (await listTenantPages(tenant.id, clientBm ?? undefined)).map((p) => ({
      id: p.metaPageId,
      name: p.name,
      metaBusinessId: p.metaBusinessId
    }));

    if (!availablePages.length && metaAccessToken) {
      try {
        availablePages = (await fetchUserPages(metaAccessToken)).map((p) => ({
          id: p.id,
          name: p.name ?? p.id,
          metaBusinessId: null
        }));
      } catch {
        availablePages = [];
      }
    }
  }

  return NextResponse.json({
    ok: true,
    settings: resolved.settings,
    publish: {
      ...resolved.publish,
      ready: !!(resolved.publish.pageId && resolved.publish.linkUrl)
    },
    client: {
      metaPageId: client?.metaPageId ?? null,
      metaLinkUrl: client?.metaLinkUrl ?? null,
      metaBusinessId: clientBm
    },
    tags: tags.map((t) => t.tag),
    availablePages
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;
  const { tenant } = await getAppContext();
  const client = await getClientBySlugOrId(tenant.id, clientId);
  if (!client) {
    return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
  }

  const body = PatchSchema.parse(await req.json().catch(() => ({})));

  if (body.metaLinkUrl?.trim()) {
    try {
      new URL(body.metaLinkUrl.trim());
    } catch {
      return NextResponse.json({ ok: false, error: "URL inválida" }, { status: 400 });
    }
  }

  const settings = await patchClientMetaSettings(client, body);

  if (body.tags) {
    const { clientTag: tagRepo } = await import("@/db/repositories").then((m) => m.repositories());
    await tagRepo.delete({ clientId: client.id });
    for (const tag of body.tags) {
      const t = tag.trim();
      if (t) await tagRepo.save(tagRepo.create({ clientId: client.id, tag: t }));
    }
  }

  const resolved = await getResolvedClientMeta(tenant.id, client.id);
  return NextResponse.json({
    ok: true,
    settings,
    publish: resolved?.publish
  });
}
