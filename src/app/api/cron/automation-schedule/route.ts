import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { runScheduleAutomations } from "@/lib/automation-engine";
import { getTenantMetaAccessToken } from "@/lib/meta-auth-store";

export const maxDuration = 60;

function authorizeCron(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

/** Roda de hora em hora: avalia as regras de automação com gatilho de horário (`condition.schedule`)
 * para todos os tenants, pausando/reativando campanhas fora/dentro da janela configurada. Separado
 * do motor de métricas porque este roda apenas sob demanda (a cada sincronização do Meta). */
export async function POST(req: Request) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { tenant: tenantRepo } = await repositories();
  const tenants = await tenantRepo.find();

  let processed = 0;
  for (const tenant of tenants) {
    const token = await getTenantMetaAccessToken(tenant.id);
    if (!token) continue;

    try {
      await runScheduleAutomations(tenant.id, token);
      processed++;
    } catch {
      // continue com os próximos tenants
    }
  }

  return NextResponse.json({ ok: true, processed });
}

/** Vercel Cron invokes via GET; keep POST for manual/internal triggering. */
export const GET = POST;
