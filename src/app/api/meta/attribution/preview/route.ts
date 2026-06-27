import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";
import { assertFeatureEnabled, FeatureDisabledError } from "@/lib/feature-flags/service";
import { resolveAttributionWindows } from "@/lib/meta-attribution";
import { resolveWorkspaceMetaAccessToken } from "@/lib/meta-auth-store";
import { fetchAccountInsightsDaily, pickConversions } from "@/lib/meta-graph";
import { getTenantAttributionWindow } from "@/lib/tenant-attribution";
import { isWorkspaceAdmin } from "@/lib/workspace-members";

/**
 * Preview **read-only** de atribuição: busca insights ao vivo com a janela
 * escolhida e devolve spend/conversões/CPA agregados — **sem gravar nada e sem
 * tocar nos snapshots/ranking**. É o "e se eu usasse a janela X?" isolado.
 */
export async function POST(req: Request) {
  try {
    await assertFeatureEnabled("meta.attribution");
    const { tenant, user } = await getAppContext();
    if (!(await isWorkspaceAdmin(tenant.id, user.id))) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      clientId?: string;
      datePreset?: string;
      window?: string;
    };
    if (!body.clientId) {
      return NextResponse.json({ ok: false, error: "clientId required" }, { status: 400 });
    }

    const { client: clientRepo, adAccount: adAccountRepo } = await repositories();
    const client = await clientRepo.findOne({ where: { id: body.clientId, tenantId: tenant.id } });
    if (!client) return NextResponse.json({ ok: false, error: "client_not_found" }, { status: 404 });

    const token = await resolveWorkspaceMetaAccessToken(tenant.id, user.id);
    if (!token) return NextResponse.json({ ok: false, error: "meta_not_connected" }, { status: 400 });

    const windowPreset = body.window ?? (await getTenantAttributionWindow(tenant.id));
    const windows = resolveAttributionWindows(windowPreset);
    const datePreset = typeof body.datePreset === "string" ? body.datePreset : "last_30d";

    const accounts = await adAccountRepo.find({ where: { clientId: body.clientId } });
    let spend = 0;
    let conversions = 0;
    for (const acc of accounts) {
      const rows = await fetchAccountInsightsDaily(
        token,
        acc.metaAdAccountId,
        datePreset,
        windows ?? undefined
      ).catch(() => []);
      for (const r of rows) {
        spend += Number(r.spend ?? 0);
        conversions += pickConversions(r.actions);
      }
    }

    return NextResponse.json({
      ok: true,
      window: windowPreset ?? "default",
      datePreset,
      accounts: accounts.length,
      spend: Math.round(spend * 100) / 100,
      conversions,
      cpa: conversions > 0 ? Math.round((spend / conversions) * 100) / 100 : null
    });
  } catch (e) {
    if (e instanceof FeatureDisabledError) {
      return NextResponse.json({ ok: false, error: "attribution_disabled" }, { status: 404 });
    }
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "error" },
      { status: 500 }
    );
  }
}
