import { NextResponse } from "next/server";
import { Between, In } from "typeorm";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { num } from "@/lib/goal-types";

function dateNDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const { tenant } = await getAppContext();
  const url = new URL(req.url);
  const clientIdParam = url.searchParams.get("clientId");
  const adAccountIdParam = url.searchParams.get("adAccountId");
  const days = Number(url.searchParams.get("days") ?? "7");

  const { adAccount: adAccountRepo, campaignMetricSnapshot: campRepo, alert: alertRepo } =
    await repositories();

  let accounts: Awaited<ReturnType<typeof adAccountRepo.find>> = [];
  if (clientIdParam) {
    const client = await getClientBySlugOrId(tenant.id, clientIdParam);
    if (!client) return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
    accounts = await adAccountRepo.find({ where: { clientId: client.id } });
  } else {
    const { getLinkedAdAccountsForTenant } = await import("@/lib/tenant-accounts");
    const { accounts: linked } = await getLinkedAdAccountsForTenant(tenant.id);
    accounts = linked;
  }

  if (adAccountIdParam) {
    accounts = accounts.filter(
      (a) => a.id === adAccountIdParam || a.metaAdAccountId === adAccountIdParam
    );
  }

  const accountIds = accounts.map((a) => a.id);
  if (!accountIds.length) return NextResponse.json({ ok: true, campaigns: [] });

  const start = dateNDaysAgo(days);
  const end = new Date().toISOString().slice(0, 10);
  const rows = await campRepo.find({
    where: { adAccountId: In(accountIds), day: Between(start, end) }
  });

  const byCampaign = new Map<
    string,
    {
      metaCampaignId: string;
      campaignName: string;
      adAccountId: string;
      metaAdAccountId: string;
      spend: number;
      conversions: number;
      leads: number;
      roasSum: number;
      roasCount: number;
      status?: string;
      dailyBudget?: number | null;
    }
  >();

  const accountMeta = new Map(accounts.map((a) => [a.id, a.metaAdAccountId]));

  for (const r of rows) {
    const key = `${r.adAccountId}:${r.metaCampaignId}`;
    const cur = byCampaign.get(key) ?? {
      metaCampaignId: r.metaCampaignId,
      campaignName: r.campaignName ?? r.metaCampaignId,
      adAccountId: r.adAccountId,
      metaAdAccountId: accountMeta.get(r.adAccountId) ?? "",
      spend: 0,
      conversions: 0,
      leads: 0,
      roasSum: 0,
      roasCount: 0,
      dailyBudget: r.dailyBudget ? num(r.dailyBudget) : null
    };
    cur.spend += num(r.spend);
    cur.conversions += num(r.conversions);
    cur.leads += num(r.leads);
    const roas = num(r.roas);
    if (roas > 0) {
      cur.roasSum += roas;
      cur.roasCount += 1;
    }
    if (r.dailyBudget) cur.dailyBudget = num(r.dailyBudget);
    byCampaign.set(key, cur);
  }

  const campaigns = [];
  for (const c of byCampaign.values()) {
    const openAlerts = await alertRepo.count({
      where: {
        tenantId: tenant.id,
        metaCampaignId: c.metaCampaignId,
        dismissed: false
      }
    });
    const cpl = c.leads > 0 ? c.spend / c.leads : 0;
    const cpa = c.conversions > 0 ? c.spend / c.conversions : 0;
    campaigns.push({
      metaCampaignId: c.metaCampaignId,
      name: c.campaignName,
      adAccountId: c.adAccountId,
      metaAdAccountId: c.metaAdAccountId,
      spend: c.spend,
      conversions: c.conversions,
      leads: c.leads,
      cpl,
      cpa,
      roas: c.roasCount ? c.roasSum / c.roasCount : 0,
      dailyBudget: c.dailyBudget,
      hasAlert: openAlerts > 0
    });
  }

  campaigns.sort((a, b) => b.spend - a.spend);
  return NextResponse.json({ ok: true, campaigns });
}
