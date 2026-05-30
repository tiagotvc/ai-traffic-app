import "server-only";

import { Between, In } from "typeorm";

import { repositories } from "@/db/repositories";
import { slugify } from "@/lib/app-context";
import { matchesClientBusinessScope } from "@/lib/client-meta-business";
import { num } from "@/lib/goal-types";

function dateNDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export async function queryCommandCenterCampaigns(input: {
  tenantId: string;
  clientIds?: string[] | null;
  q?: string;
  onlyAlerts?: boolean;
  onlyActive?: boolean;
  tag?: string;
  days?: number;
  limit?: number;
  offset?: number;
  metaBusinessId?: string | null;
}) {
  const {
    client: clientRepo,
    adAccount: adRepo,
    campaignMetricSnapshot: campRepo,
    alert: alertRepo,
    clientTag: tagRepo
  } = await repositories();

  const since = dateNDaysAgo(input.days ?? 7);
  const today = new Date().toISOString().slice(0, 10);

  let clients = await clientRepo.find({ where: { tenantId: input.tenantId }, order: { name: "ASC" } });
  if (input.clientIds?.length) {
    clients = clients.filter((c) => input.clientIds!.includes(c.id));
  }
  if (input.q?.trim()) {
    const q = input.q.trim().toLowerCase();
    clients = clients.filter(
      (c) => c.name.toLowerCase().includes(q) || slugify(c.name).includes(q)
    );
  }
  if (input.tag?.trim()) {
    const tagged = await tagRepo.find({ where: { tag: input.tag.trim() } });
    const ids = new Set(tagged.map((t) => t.clientId));
    clients = clients.filter((c) => ids.has(c.id));
  }

  const clientIds = clients.map((c) => c.id);
  if (!clientIds.length) return { rows: [], total: 0 };

  let accounts = await adRepo.find({ where: { clientId: In(clientIds) } });
  const clientBm = input.metaBusinessId?.trim() || null;
  if (clientBm) {
    accounts = accounts.filter((a) => matchesClientBusinessScope(a.metaBusinessId, clientBm));
  }
  const accountIds = accounts.map((a) => a.id);
  if (!accountIds.length) return { rows: [], total: 0 };

  const snaps = await campRepo.find({
    where: { adAccountId: In(accountIds), day: Between(since, today) }
  });

  const openAlerts = await alertRepo.find({
    where: { tenantId: input.tenantId, dismissed: false }
  });
  const alertsByCampaign = new Map<string, number>();
  for (const a of openAlerts) {
    if (!a.metaCampaignId) continue;
    alertsByCampaign.set(a.metaCampaignId, (alertsByCampaign.get(a.metaCampaignId) ?? 0) + 1);
  }

  const clientById = new Map(clients.map((c) => [c.id, c]));
  const accountById = new Map(accounts.map((a) => [a.id, a]));

  const agg = new Map<
    string,
    {
      metaCampaignId: string;
      campaignName: string;
      adAccountId: string;
      clientId: string;
      spend: number;
      conversions: number;
      leads: number;
      roasSum: number;
      roasN: number;
      status?: string;
    }
  >();

  for (const s of snaps) {
    const key = s.metaCampaignId;
    let row = agg.get(key);
    if (!row) {
      const acc = accountById.get(s.adAccountId);
      row = {
        metaCampaignId: key,
        campaignName: s.campaignName ?? key,
        adAccountId: s.adAccountId,
        clientId: acc?.clientId ?? "",
        spend: 0,
        conversions: 0,
        leads: 0,
        roasSum: 0,
        roasN: 0
      };
      agg.set(key, row);
    }
    row.spend += num(s.spend);
    row.conversions += num(s.conversions);
    row.leads += num(s.leads);
    const roas = num(s.roas);
    if (roas > 0) {
      row.roasSum += roas;
      row.roasN += 1;
    }
  }

  const tags = await tagRepo.find({ where: { clientId: In(clientIds) } });
  const tagsByClient = new Map<string, string[]>();
  for (const tag of tags) {
    const list = tagsByClient.get(tag.clientId) ?? [];
    list.push(tag.tag);
    tagsByClient.set(tag.clientId, list);
  }

  let rows = [...agg.values()].map((r) => {
    const client = clientById.get(r.clientId);
    const acc = accountById.get(r.adAccountId);
    const alertCount = alertsByCampaign.get(r.metaCampaignId) ?? 0;
    const clientTags = tagsByClient.get(r.clientId) ?? [];
    return {
      metaCampaignId: r.metaCampaignId,
      campaignName: r.campaignName,
      clientId: r.clientId,
      clientName: client?.name ?? "—",
      clientSlug: client ? slugify(client.name) : "",
      clientTag: clientTags[0] ?? null,
      adAccountId: r.adAccountId,
      accountLabel: acc?.label ?? acc?.metaAdAccountId ?? "—",
      metaAdAccountId: acc?.metaAdAccountId ?? "",
      spend: r.spend,
      conversions: r.conversions,
      leads: r.leads,
      cpl: r.leads > 0 ? r.spend / r.leads : null,
      cpa: r.conversions > 0 ? r.spend / r.conversions : null,
      roas: r.roasN ? r.roasSum / r.roasN : 0,
      alertCount,
      hasAlert: alertCount > 0
    };
  });

  if (input.onlyAlerts) rows = rows.filter((r) => r.hasAlert);

  rows.sort((a, b) => b.alertCount - a.alertCount || b.spend - a.spend);
  const total = rows.length;
  const offset = input.offset ?? 0;
  const limit = input.limit ?? 100;
  rows = rows.slice(offset, offset + limit);

  return { rows, total };
}
