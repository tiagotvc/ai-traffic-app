import { NextResponse } from "next/server";
import { In } from "typeorm";

import { getAppContext } from "@/lib/app-context";
import { canUseCommander } from "@/lib/commander/access";
import { isPlatformFeatureEnabled } from "@/lib/feature-flags/service";
import { repositories } from "@/db/repositories";

/** Log recente de execuções dos Scientists (todos, tenant-wide) — base da aba Cientistas. */
export async function GET() {
  try {
    const { tenant, user, platformAdmin, entitlements } = await getAppContext();

    const context = { userId: user.id, isPlatformAdmin: platformAdmin };
    const commanderPlatform = await isPlatformFeatureEnabled("commander.modules.campaigns", context);
    const userDisabled = new Set(tenant.commanderDisabledCapabilities ?? []);
    const allowed = canUseCommander({
      planSlug: entitlements.planSlug,
      allowCommander: entitlements.limits.allowCommander,
      platformEnabled: commanderPlatform,
      environmentEnabled: process.env.ENABLE_COMMANDER !== "false",
      platformAdmin,
      userEnabled: !userDisabled.has("commander")
    });
    if (!allowed) {
      return NextResponse.json({ ok: false, error: "Commander indisponível no seu plano" }, { status: 403 });
    }

    const { scientistRun: runRepo, client: clientRepo } = await repositories();
    const runs = await runRepo.find({
      where: { tenantId: tenant.id },
      order: { createdAt: "DESC" },
      take: 150
    });

    const clientIds = [...new Set(runs.map((r) => r.clientId).filter((id): id is string => Boolean(id)))];
    const clients = clientIds.length ? await clientRepo.find({ where: { id: In(clientIds) } }) : [];
    const clientNameById = new Map(clients.map((c) => [c.id, c.name]));

    return NextResponse.json({
      ok: true,
      runs: runs.map((r) => ({
        id: r.id,
        scientistId: r.scientistId,
        clientName: r.clientId ? (clientNameById.get(r.clientId) ?? null) : null,
        ran: r.ran,
        reason: r.reason ?? null,
        summary: r.summary ?? null,
        findingsCount: r.findings?.length ?? 0,
        confidence: r.confidence ?? null,
        createdAt: r.createdAt.toISOString()
      }))
    });
  } catch (err) {
    console.error("[commander scientists runs]", err);
    return NextResponse.json({ ok: false, error: "Erro ao carregar o histórico" }, { status: 500 });
  }
}
