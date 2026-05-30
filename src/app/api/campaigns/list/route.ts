import { NextResponse } from "next/server";
import { In } from "typeorm";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId, slugify } from "@/lib/app-context";
import { matchesClientBusinessScope } from "@/lib/client-meta-business";
import { listClientIdsForUser } from "@/lib/client-meta-settings";
import { queryCommandCenterCampaigns } from "@/lib/command-center-query";
import { fetchCampaigns } from "@/lib/meta-graph";

export async function GET(req: Request) {
  const { tenant, user, metaAccessToken } = await getAppContext();
  const url = new URL(req.url);
  let clientIds = await listClientIdsForUser(tenant.id, user.id);
  const clientSlug = url.searchParams.get("clientId")?.trim();
  let scopeClient: Awaited<ReturnType<typeof getClientBySlugOrId>> = null;
  if (clientSlug) {
    scopeClient = await getClientBySlugOrId(tenant.id, clientSlug);
    if (scopeClient) clientIds = [scopeClient.id];
  }

  const cc = await queryCommandCenterCampaigns({
    tenantId: tenant.id,
    clientIds,
    metaBusinessId: scopeClient?.metaBusinessId ?? null,
    q: url.searchParams.get("q") ?? undefined,
    onlyAlerts: url.searchParams.get("onlyAlerts") === "1",
    limit: 500
  });

  const byId = new Map(
    cc.rows.map((r) => [r.metaCampaignId, { ...r, status: "ACTIVE" as string }])
  );

  if (metaAccessToken) {
    const { adAccount: adRepo, client: clientRepo } = await repositories();
    const clients = await clientRepo.find({ where: { tenantId: tenant.id } });
    const allowed = new Set(
      clientIds?.length ? clientIds : clients.map((c) => c.id)
    );
    let accounts = await adRepo.find({
      where: { clientId: In([...allowed]) }
    });

    const clientBm = scopeClient?.metaBusinessId?.trim() || null;
    if (clientBm) {
      accounts = accounts.filter((a) => matchesClientBusinessScope(a.metaBusinessId, clientBm));
    }

    const clientById = new Map(clients.map((c) => [c.id, c]));

    for (const acc of accounts) {
      try {
        const camps = await fetchCampaigns(metaAccessToken, acc.metaAdAccountId);
        const client = clientById.get(acc.clientId);
        for (const c of camps) {
          if (!c.id || byId.has(c.id)) continue;
          byId.set(c.id, {
            metaCampaignId: c.id,
            campaignName: c.name ?? c.id,
            clientId: acc.clientId,
            clientName: client?.name ?? "—",
            clientSlug: client ? slugify(client.name) : "",
            clientTag: "",
            adAccountId: acc.id,
            accountLabel: acc.label ?? acc.metaAdAccountId,
            metaAdAccountId: acc.metaAdAccountId,
            spend: 0,
            conversions: 0,
            leads: 0,
            cpl: null,
            cpa: null,
            roas: 0,
            alertCount: 0,
            hasAlert: false,
            status: c.status ?? "UNKNOWN"
          });
        }
      } catch {
        /* skip account */
      }
    }
  }

  const rows = [...byId.values()].sort((a, b) =>
    (a.campaignName ?? "").localeCompare(b.campaignName ?? "")
  );

  return NextResponse.json({ ok: true, rows, total: rows.length });
}
