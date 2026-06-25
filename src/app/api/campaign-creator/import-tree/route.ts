import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { getOrCreateClientMetaSettings } from "@/lib/client-meta-settings";
import { TRAFFIC_AI_AUDIENCE_PREFIX } from "@/lib/audience-targeting-shared";
import {
  fetchAdSetsForCampaign,
  fetchAdsForAdSetLite,
  fetchCampaigns
} from "@/lib/meta-graph";
import { getTenantMetaAccessToken } from "@/lib/meta-auth-store";

const QuerySchema = z.object({
  clientId: z.string().min(1),
  adAccountId: z.string().min(1),
  level: z.enum(["campaigns", "adsets", "ads"]),
  campaignId: z.string().optional(),
  adsetId: z.string().optional(),
  q: z.string().optional(),
  scoped: z.enum(["0", "1"]).optional()
});

async function assertClientAccount(
  tenantId: string,
  clientSlug: string,
  adAccountId: string
) {
  const client = await getClientBySlugOrId(tenantId, clientSlug);
  if (!client) return { error: NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 }) };

  const { adAccount: adAccountRepo } = await repositories();
  const linked = await adAccountRepo.findOne({
    where: { clientId: client.id, metaAdAccountId: adAccountId }
  });
  if (!linked) {
    return { error: NextResponse.json({ ok: false, error: "Conta não vinculada ao cliente" }, { status: 403 }) };
  }
  return { client };
}

function filterByQuery<T extends { name?: string; id: string }>(rows: T[], q?: string) {
  if (!q?.trim()) return rows;
  const needle = q.trim().toLowerCase();
  return rows.filter((r) => `${r.name ?? ""} ${r.id}`.toLowerCase().includes(needle));
}

function clientCampaignPrefix(clientName: string, settingsPrefix: string | null): string {
  const custom = settingsPrefix?.trim();
  if (custom) return custom;
  return `${TRAFFIC_AI_AUDIENCE_PREFIX} ${clientName}`.trim();
}

function filterCampaignsForClient(
  rows: Array<{ id: string; name?: string; status?: string; objective?: string }>,
  prefix: string,
  scoped: boolean
) {
  if (!scoped) return rows.slice(0, 40);
  const needle = prefix.toLowerCase();
  const filtered = rows.filter((c) => (c.name ?? "").toLowerCase().includes(needle));
  return filtered.slice(0, 40);
}

export async function GET(req: Request) {
  const { tenant, user, metaAccessToken } = await getAppContext();
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    clientId: url.searchParams.get("clientId")?.trim(),
    adAccountId: url.searchParams.get("adAccountId")?.trim(),
    level: url.searchParams.get("level")?.trim(),
    campaignId: url.searchParams.get("campaignId")?.trim() || undefined,
    adsetId: url.searchParams.get("adsetId")?.trim() || undefined,
    q: url.searchParams.get("q")?.trim() || undefined,
    scoped: url.searchParams.get("scoped")?.trim() as "0" | "1" | undefined
  });

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Parâmetros inválidos" }, { status: 400 });
  }

  const { clientId, adAccountId, level, campaignId, adsetId, q } = parsed.data;
  const scoped = parsed.data.scoped !== "0";
  const gate = await assertClientAccount(tenant.id, clientId, adAccountId);
  if ("error" in gate && gate.error) return gate.error;
  const client = gate.client!;

  const token = metaAccessToken ?? (await getTenantMetaAccessToken(tenant.id, user.id));
  if (!token) {
    return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
  }

  try {
    if (level === "campaigns") {
      const all = await fetchCampaigns(token, adAccountId);
      const settings = await getOrCreateClientMetaSettings(client.id);
      const prefix = clientCampaignPrefix(client.name, settings.campaignNamePrefix);
      const scopedRows = filterCampaignsForClient(all, prefix, scoped);
      const rows = filterByQuery(scopedRows, q);
      return NextResponse.json({
        ok: true,
        level,
        scoped,
        items: rows.map((c) => ({
          id: c.id,
          name: c.name ?? c.id,
          status: c.status,
          objective: c.objective
        }))
      });
    }

    if (level === "adsets") {
      if (!campaignId) {
        return NextResponse.json({ ok: false, error: "campaignId required" }, { status: 400 });
      }
      const rows = filterByQuery(await fetchAdSetsForCampaign(token, campaignId), q).slice(0, 80);
      return NextResponse.json({
        ok: true,
        level,
        campaignId,
        items: rows.map((a) => ({
          id: a.id,
          name: a.name ?? a.id,
          status: a.status
        }))
      });
    }

    if (!adsetId) {
      return NextResponse.json({ ok: false, error: "adsetId required" }, { status: 400 });
    }
    const rows = filterByQuery(await fetchAdsForAdSetLite(token, adsetId, 50), q);
    return NextResponse.json({
      ok: true,
      level,
      campaignId,
      adsetId,
      items: rows.map((a) => ({
        id: a.id,
        name: a.name ?? a.id,
        status: a.status,
        thumbnailUrl: a.thumbnailUrl
      }))
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao carregar dados";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
