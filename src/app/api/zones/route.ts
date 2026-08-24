import { NextResponse } from "next/server";
import { z } from "zod";

import type { ZoneGeoRules } from "@/db/entities/UserZone";
import { getAppContext } from "@/lib/app-context";
import { chargeOrRespond, recordAiCreditUsage } from "@/lib/ai-credits";
import { createUserZone, listUserZones } from "@/lib/user-persona-zone";

const CreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  geoRules: z.custom<ZoneGeoRules>(),
  sourcePrompt: z.string().optional()
});

export async function GET() {
  const { tenant, user } = await getAppContext();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });
  }

  const zones = await listUserZones({ tenantId: tenant.id, userId: user.id });
  return NextResponse.json({ ok: true, zones });
}

export async function POST(req: Request) {
  const { tenant, user } = await getAppContext();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });
  }

  const body = CreateSchema.parse(await req.json().catch(() => ({})));

  const charge = await chargeOrRespond({
    tenantId: tenant.id,
    kind: "zone_save",
    requireCreativeMemory: false
  });
  if (!charge.ok) return charge.response;

  const zone = await createUserZone({
    tenantId: tenant.id,
    userId: user.id,
    name: body.name,
    description: body.description,
    geoRules: body.geoRules,
    sourcePrompt: body.sourcePrompt
  });
  await recordAiCreditUsage({
    tenantId: tenant.id,
    clientId: null,
    kind: "zone_save",
    createdCount: 1,
    creditsCharged: charge.creditsCharged
  });

  return NextResponse.json({ ok: true, zone });
}
