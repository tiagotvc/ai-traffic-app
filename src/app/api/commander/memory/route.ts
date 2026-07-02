import { NextResponse } from "next/server";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { getClientCampaignMetrics } from "@/lib/agency-brain/metrics-input";
import { canUseCommander } from "@/lib/commander/access";
import { isPlatformFeatureEnabled } from "@/lib/feature-flags/service";

/**
 * Memória do Brain pro painel do Commander: top 5 campanhas reais dos últimos 7 dias
 * por gasto (mesma janela/ordenação já usada no contexto do chat em src/lib/commander/ask.ts).
 * Gate composto igual ao de /api/campaign-creator/flags e /api/commander/ask:
 * env + flag de plataforma (commander E memory) + plano.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const clientSlug = searchParams.get("clientSlug");
  if (!clientSlug) {
    return NextResponse.json({ ok: false, error: "clientSlug é obrigatório" }, { status: 400 });
  }

  const { tenant, user, platformAdmin, entitlements } = await getAppContext();
  const context = { userId: user.id, isPlatformAdmin: platformAdmin };
  const [commanderPlatform, memoryFlag] = await Promise.all([
    isPlatformFeatureEnabled("campaigns.commander", context),
    isPlatformFeatureEnabled("campaigns.commander.memory", context)
  ]);
  const commander = canUseCommander({
    planSlug: entitlements.planSlug,
    allowCommander: entitlements.limits.allowCommander,
    platformEnabled: commanderPlatform,
    environmentEnabled: process.env.ENABLE_COMMANDER !== "false",
    platformAdmin
  });
  if (!commander || !memoryFlag) {
    return NextResponse.json({ ok: false, error: "Memória do Commander indisponível" }, { status: 403 });
  }

  const client = await getClientBySlugOrId(tenant.id, clientSlug);
  if (!client) {
    return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
  }

  const rows = await getClientCampaignMetrics(tenant.id, client.id, 7);
  const top = [...rows].sort((a, b) => b.spend - a.spend).slice(0, 5);

  return NextResponse.json({
    ok: true,
    windowDays: 7,
    campaigns: top.map((r) => ({
      campaignName: r.campaignName,
      spend: r.spend,
      conversions: r.conversions,
      ctr: r.ctr,
      cpa: r.cpa,
      roas: r.roas
    }))
  });
}
