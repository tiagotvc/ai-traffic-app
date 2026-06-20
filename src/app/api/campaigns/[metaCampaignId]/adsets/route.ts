import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { resolveMetaTokensForApi } from "@/lib/campaign-detail-api";
import {
  AdDraftItemSchema,
  AdSetDraftItemSchema
} from "@/lib/campaign-draft";
import { getOrCreateClientMetaSettings } from "@/lib/client-meta-settings";
import { requireMetaPublishConfig } from "@/lib/client-publish-config";
import { publishAdsetToCampaign } from "@/lib/meta-campaign";
import {
  fetchAdSetInsightsForCampaign,
  fetchAdSetsForCampaign,
  fetchCampaign,
  type MetaAdSetInsight
} from "@/lib/meta-graph";
import { type MetricKey } from "@/lib/dashboard-metrics";
import { applyServerTiming } from "@/lib/server-timing";
import { parsePeriodFromSearchParams, rollingDaysEndingYesterday, yesterdayIso } from "@/lib/report-period";

function metricsFromInsight(m: MetaAdSetInsight | null): Partial<Record<MetricKey, number>> {
  const spend = m?.spend ?? 0;
  const impressions = m?.impressions ?? 0;
  const clicks = m?.clicks ?? 0;
  const reach = m?.reach ?? 0;
  const conversions = m?.conversions ?? 0;
  const messages = m?.messages ?? 0;
  return {
    spend,
    impressions,
    clicks,
    reach,
    conversions,
    messages,
    ctr: m?.ctr ?? (impressions > 0 ? (clicks / impressions) * 100 : 0),
    cpc: clicks > 0 ? spend / clicks : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    cpa: conversions > 0 ? spend / conversions : 0,
    cpmsg: messages > 0 ? spend / messages : 0,
    frequency: reach > 0 ? impressions / reach : 0,
    roas: m?.roas ?? 0
  };
}

function resolveSinceUntil(period: ReturnType<typeof parsePeriodFromSearchParams>) {
  if (period.allTime) {
    const since = new Date();
    since.setFullYear(since.getFullYear() - 2);
    return { since: since.toISOString().slice(0, 10), until: yesterdayIso() };
  }
  const fallback = rollingDaysEndingYesterday(7);
  return {
    since: period.since ?? fallback.since,
    until: period.until ?? fallback.until
  };
}

async function resolveAdAccountMetaId(
  tenantId: string,
  metaCampaignId: string
): Promise<string | null> {
  const { campaignMetricSnapshot: campRepo, adAccount: adRepo } = await repositories();
  const snap = await campRepo.findOne({
    where: { metaCampaignId },
    order: { day: "DESC" }
  });
  if (!snap) return null;
  const acc = await adRepo.findOne({ where: { id: snap.adAccountId } });
  if (!acc) return null;
  const client = await (await repositories()).client.findOne({ where: { id: acc.clientId } });
  if (!client || client.tenantId !== tenantId) return null;
  return acc.metaAdAccountId;
}

async function loadAdSets(
  tenantId: string,
  metaCampaignId: string,
  since: string,
  until: string,
  primaryToken?: string,
  fallbackToken?: string
) {
  const tMeta = Date.now();
  for (const token of [primaryToken, fallbackToken]) {
    if (!token) continue;
    try {
      const adsets = await fetchAdSetsForCampaign(token, metaCampaignId);
      const metaAdAccountId = await resolveAdAccountMetaId(tenantId, metaCampaignId);

      let insightsByAdset = new Map<string, MetaAdSetInsight>();
      if (metaAdAccountId) {
        try {
          insightsByAdset = await fetchAdSetInsightsForCampaign(
            token,
            metaAdAccountId,
            metaCampaignId,
            since,
            until
          );
        } catch {
          /* fallback per-adset abaixo */
        }
      }

      const enriched = adsets.map((a) => {
        const insights = insightsByAdset.get(a.id) ?? null;
        const spend = insights?.spend ?? 0;
        const conversions = insights?.conversions ?? 0;
        return {
          id: a.id,
          name: a.name,
          status: a.status,
          dailyBudget: a.daily_budget ? Number(a.daily_budget) / 100 : null,
          spend,
          conversions,
          cpa: conversions > 0 ? spend / conversions : null,
          roas: insights?.roas ?? 0,
          reach: insights?.reach ?? 0,
          clicks: insights?.clicks ?? 0,
          ctr: insights?.ctr ?? 0,
          metrics: metricsFromInsight(insights)
        };
      });

      return { adsets: enriched, metaMs: Date.now() - tMeta };
    } catch {
      /* try fallback token */
    }
  }
  return { adsets: [], metaMs: Date.now() - tMeta };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ metaCampaignId: string }> }
) {
  const t0 = Date.now();
  const { metaCampaignId } = await params;
  const { tenant, user, metaAccessToken: ctxToken } = await getAppContext();
  const { metaAccessToken, fallbackMetaToken } = await resolveMetaTokensForApi(
    tenant.id,
    user.id,
    ctxToken
  );

  if (!metaAccessToken && !fallbackMetaToken) {
    return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
  }

  const period = parsePeriodFromSearchParams(new URL(req.url));
  const { since, until } = resolveSinceUntil(period);

  const { campaignPreset: presetRepo } = await repositories();
  const presetRow = await presetRepo.findOne({
    where: { tenantId: tenant.id, metaCampaignId }
  });
  const preset = presetRow?.preset ?? "default";

  const { adsets, metaMs } = await loadAdSets(
    tenant.id,
    metaCampaignId,
    since,
    until,
    metaAccessToken ?? undefined,
    fallbackMetaToken
  );

  const res = NextResponse.json({ ok: true, adsets, preset });
  return applyServerTiming(res, { total: Date.now() - t0, meta: metaMs, db: Date.now() - t0 - metaMs });
}

const CreateAdsetBodySchema = z.object({
  clientId: z.string().min(1),
  adAccountId: z.string().min(1),
  objective: z.enum(["awareness", "traffic", "engagement", "leads", "app", "sales"]),
  adset: AdSetDraftItemSchema,
  ad: AdDraftItemSchema,
  campaignName: z.string().optional(),
  campaign: z.object({
    name: z.string(),
    budgetLevel: z.enum(["campaign", "adset"]),
    dailyBudgetBRL: z.number(),
    bidStrategy: z.enum(["lowest_cost"]),
    specialAdCategories: z.array(z.string()),
    abTestEnabled: z.boolean()
  })
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ metaCampaignId: string }> }
) {
  const { tenant, metaAccessToken } = await getAppContext();
  if (!metaAccessToken) {
    return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
  }

  const { metaCampaignId } = await params;
  const body = CreateAdsetBodySchema.parse(await req.json().catch(() => ({})));
  const client = await getClientBySlugOrId(tenant.id, body.clientId);
  if (!client) {
    return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
  }

  const { adAccount: adAccountRepo } = await repositories();
  const linked = await adAccountRepo.findOne({
    where: { clientId: client.id, metaAdAccountId: body.adAccountId }
  });
  if (!linked) {
    return NextResponse.json({ ok: false, error: "Conta não vinculada ao cliente" }, { status: 403 });
  }

  let publish;
  try {
    publish = requireMetaPublishConfig({
      metaPageId: body.ad.pageId || client.metaPageId,
      metaLinkUrl: body.ad.linkUrl || client.metaLinkUrl
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "CLIENT_PUBLISH_CONFIG_REQUIRED",
        message: "Configure página e URL de destino do cliente."
      },
      { status: 400 }
    );
  }

  const settings = await getOrCreateClientMetaSettings(client.id);
  let isCampaignBudget = body.campaign.budgetLevel === "campaign";
  try {
    const remoteCampaign = await fetchCampaign(metaAccessToken, metaCampaignId);
    isCampaignBudget = Boolean(remoteCampaign.daily_budget);
  } catch {
    /* usa draft */
  }

  try {
    const result = await publishAdsetToCampaign({
      accessToken: metaAccessToken,
      adAccountId: body.adAccountId,
      metaCampaignId,
      adset: body.adset,
      ad: body.ad,
      objective: body.objective,
      campaign: body.campaign,
      pageId: publish.metaPageId,
      linkUrl: publish.metaLinkUrl,
      settings,
      callToAction: settings.defaultCta,
      campaignName: body.campaignName,
      isCampaignBudget
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao criar conjunto";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
