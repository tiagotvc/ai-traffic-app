import { NextResponse } from "next/server";
import { Between, In } from "typeorm";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId, slugify } from "@/lib/app-context";
import { invalidateClientsListCache } from "@/lib/clients-list";
import { num } from "@/lib/goal-types";

function dateNDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;
    const { tenant } = await getAppContext();
    const {
      adAccount: adAccountRepo,
      metricSnapshot: metricsRepo,
      campaignMetricSnapshot: campRepo,
      alert: alertRepo
    } = await repositories();

    const client = await getClientBySlugOrId(tenant.id, clientId);
    if (!client) {
      return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
    }

    const accounts = await adAccountRepo.find({ where: { clientId: client.id } });
    const accountIds = accounts.map((a) => a.id);

    const metrics = accountIds.length
      ? await metricsRepo.find({ where: { adAccountId: In(accountIds) } })
      : [];

    let spend = 0;
    let conversions = 0;
    let leads = 0;
    let roasSum = 0;
    let roasCount = 0;

    for (const m of metrics) {
      spend += Number(m.spend) || 0;
      conversions += Number(m.conversions) || 0;
      const roas = Number(m.roas);
      if (!Number.isNaN(roas) && roas > 0) {
        roasSum += roas;
        roasCount += 1;
      }
    }

    const start = dateNDaysAgo(7);
    const end = new Date().toISOString().slice(0, 10);
    const campRows = accountIds.length
      ? await campRepo.find({
          where: { adAccountId: In(accountIds), day: Between(start, end) }
        })
      : [];

    for (const r of campRows) {
      leads += num(r.leads);
    }

    const cpa = conversions > 0 ? spend / conversions : 0;
    const cpl = leads > 0 ? spend / leads : 0;
    const roas = roasCount ? roasSum / roasCount : 0;

    const byCampaign = new Map<
      string,
      { id: string; name: string; spend: number; conversions: number; leads: number; roasSum: number; roasCount: number }
    >();

    for (const r of campRows) {
      const cur = byCampaign.get(r.metaCampaignId) ?? {
        id: r.metaCampaignId,
        name: r.campaignName ?? r.metaCampaignId,
        spend: 0,
        conversions: 0,
        leads: 0,
        roasSum: 0,
        roasCount: 0
      };
      cur.spend += num(r.spend);
      cur.conversions += num(r.conversions);
      cur.leads += num(r.leads);
      const rVal = num(r.roas);
      if (rVal > 0) {
        cur.roasSum += rVal;
        cur.roasCount += 1;
      }
      byCampaign.set(r.metaCampaignId, cur);
    }

    const campaigns = await Promise.all(
      [...byCampaign.values()].map(async (c) => {
        const alertCount = await alertRepo.count({
          where: {
            tenantId: tenant.id,
            clientId: client.id,
            metaCampaignId: c.id,
            dismissed: false
          }
        });
        const cplCamp = c.leads > 0 ? c.spend / c.leads : 0;
        const roasCamp = c.roasCount ? c.roasSum / c.roasCount : 0;
        return {
          id: c.id,
          name: c.name,
          status: alertCount > 0 ? "ALERT" : "OK",
          roas: roasCamp > 0 ? `${roasCamp.toFixed(1)}x` : "—",
          spend: `R$ ${c.spend.toFixed(2)}`,
          cpl: cplCamp > 0 ? cplCamp : null,
          hasAlert: alertCount > 0
        };
      })
    );

    campaigns.sort((a, b) => parseFloat(b.spend.replace(/[^\d.]/g, "")) - parseFloat(a.spend.replace(/[^\d.]/g, "")));

    return NextResponse.json({
      ok: true,
      client: {
        id: client.id,
        slug: slugify(client.name),
        name: client.name,
        aiContext: client.aiContext,
        niche: client.niche ?? null,
        kpis: { spend, conversions, cpa, cpl, roas, leads },
        accounts: accounts.map((a) => ({
          id: a.id,
          metaAdAccountId: a.metaAdAccountId,
          label: a.label ?? a.metaAdAccountId
        })),
        campaigns
      }
    });
  } catch (e) {
    console.error("[GET /api/clients/:clientId]", e);
    const message = e instanceof Error ? e.message : "Erro interno";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;
  const { tenant } = await getAppContext();
  const { client: clientRepo } = await repositories();

  const client = await getClientBySlugOrId(tenant.id, clientId);
  if (!client) return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });

  if (client.name === "Default") {
    return NextResponse.json({ ok: false, error: "Não é possível excluir o cliente Default" }, { status: 400 });
  }

  await clientRepo.remove(client);
  await invalidateClientsListCache(tenant.id);
  return NextResponse.json({ ok: true });
}
