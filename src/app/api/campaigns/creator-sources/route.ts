import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { fetchCampaigns } from "@/lib/meta-graph";
import { getTenantMetaAccessToken } from "@/lib/meta-auth-store";

export async function GET(req: Request) {
  const { tenant, user, metaAccessToken } = await getAppContext();
  const clientSlug = new URL(req.url).searchParams.get("clientId")?.trim();
  if (!clientSlug) {
    return NextResponse.json({ ok: false, error: "clientId required" }, { status: 400 });
  }

  const client = await getClientBySlugOrId(tenant.id, clientSlug);
  if (!client) {
    return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
  }

  const { adAccount: adAccountRepo, campaignTemplate: templateRepo } = await repositories();
  const linkedAccounts = await adAccountRepo.find({ where: { clientId: client.id } });
  const accountIds = linkedAccounts.map((a) => a.metaAdAccountId);

  const token = metaAccessToken ?? (await getTenantMetaAccessToken(tenant.id, user.id));
  const campaigns: Array<{
    id: string;
    name: string;
    objective?: string;
    status?: string;
    source: "meta" | "draft";
  }> = [];

  if (token && accountIds.length) {
    for (const actId of accountIds.slice(0, 3)) {
      try {
        const rows = await fetchCampaigns(token, actId);
        for (const c of rows) {
          campaigns.push({
            id: c.id,
            name: c.name ?? c.id,
            objective: c.objective,
            status: c.status,
            source: "meta"
          });
        }
      } catch {
        /* skip account */
      }
    }
  }

  const templates = await templateRepo.find({
    where: { tenantId: tenant.id, clientId: client.id },
    order: { updatedAt: "DESC" },
    take: 20
  });
  for (const t of templates) {
    const payload = t.payload as { meta?: { campaignId?: string } } | undefined;
    if (!payload?.meta?.campaignId) {
      campaigns.push({
        id: `draft:${t.id}`,
        name: `${t.name} (rascunho)`,
        status: "DRAFT",
        source: "draft"
      });
    }
  }

  const seen = new Set<string>();
  const unique = campaigns.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  return NextResponse.json({ ok: true, campaigns: unique.slice(0, 100) });
}
