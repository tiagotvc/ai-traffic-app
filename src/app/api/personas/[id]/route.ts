import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext } from "@/lib/app-context";
import { finalizeFlexibleSpecTargeting } from "@/lib/meta-targeting-prune";
import {
  deleteUserPersona,
  getUserPersona,
  updateUserPersona
} from "@/lib/user-persona-zone";

const PatchSchema = z.object({
  adAccountId: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  ageMin: z.number().int().min(13).max(65).optional(),
  ageMax: z.number().int().min(13).max(65).optional(),
  gender: z.enum(["all", "male", "female"]).optional(),
  targeting: z.record(z.string(), z.unknown()).optional(),
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
  const persona = await getUserPersona({ tenantId: tenant.id, userId: user.id, id });
  if (!persona) {
    return NextResponse.json({ ok: false, error: "Persona não encontrada" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, persona });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, user, metaAccessToken } = await getAppContext();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const persona = await getUserPersona({ tenantId: tenant.id, userId: user.id, id });
  if (!persona) {
    return NextResponse.json({ ok: false, error: "Persona não encontrada" }, { status: 404 });
  }

  const body = PatchSchema.parse(await req.json().catch(() => ({})));
  const { adAccountId, ...patchBody } = body;

  let removedSegments: Array<{ id: string; name?: string }> | undefined;
  if (patchBody.targeting && metaAccessToken && adAccountId) {
    const finalized = await finalizeFlexibleSpecTargeting(
      patchBody.targeting,
      metaAccessToken,
      adAccountId
    );
    patchBody.targeting = finalized.targeting;
    removedSegments = finalized.removed.length ? finalized.removed : undefined;
  }

  const updated = await updateUserPersona(persona, patchBody);
  return NextResponse.json({ ok: true, persona: updated, removedSegments });
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
  const persona = await getUserPersona({ tenantId: tenant.id, userId: user.id, id });
  if (!persona) {
    return NextResponse.json({ ok: false, error: "Persona não encontrada" }, { status: 404 });
  }

  await deleteUserPersona(persona);
  return NextResponse.json({ ok: true });
}
