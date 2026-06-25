import { NextResponse } from "next/server";
import { z } from "zod";

import type { ZoneGeoRules } from "@/db/entities/UserZone";
import { getAppContext } from "@/lib/app-context";
import {
  deleteUserZone,
  getUserZone,
  updateUserZone
} from "@/lib/user-persona-zone";

const PatchSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  geoRules: z.custom<ZoneGeoRules>().optional(),
  sourcePrompt: z.string().nullable().optional()
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, user } = await getAppContext();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const zone = await getUserZone({ tenantId: tenant.id, userId: user.id, id });
  if (!zone) {
    return NextResponse.json({ ok: false, error: "Zona não encontrada" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, zone });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, user } = await getAppContext();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const zone = await getUserZone({ tenantId: tenant.id, userId: user.id, id });
  if (!zone) {
    return NextResponse.json({ ok: false, error: "Zona não encontrada" }, { status: 404 });
  }

  const body = PatchSchema.parse(await req.json().catch(() => ({})));
  const updated = await updateUserZone(zone, body);
  return NextResponse.json({ ok: true, zone: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, user } = await getAppContext();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const zone = await getUserZone({ tenantId: tenant.id, userId: user.id, id });
  if (!zone) {
    return NextResponse.json({ ok: false, error: "Zona não encontrada" }, { status: 404 });
  }

  await deleteUserZone(zone);
  return NextResponse.json({ ok: true });
}
