import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";
import { redisDeleteByPrefix } from "@/lib/redis-cache";

/**
 * Preferência do usuário sobre quais capacidades/Scientists do Commander ele quer
 * ligados — independente das feature flags de plataforma (que definem o que EXISTE;
 * isto define o que o usuário QUER). Uma capacidade só fica ativa quando os dois
 * lados topam.
 */
export async function GET() {
  const { tenant } = await getAppContext();
  return NextResponse.json({ ok: true, disabled: tenant.commanderDisabledCapabilities ?? [] });
}

const PatchSchema = z.object({ id: z.string().min(1).max(120), enabled: z.boolean() });

export async function PATCH(req: Request) {
  const { tenant } = await getAppContext();
  const body = PatchSchema.parse(await req.json().catch(() => ({})));

  const { tenant: tenantRepo } = await repositories();
  const current = new Set(tenant.commanderDisabledCapabilities ?? []);
  if (body.enabled) current.delete(body.id);
  else current.add(body.id);

  const disabled = [...current];
  await tenantRepo.update({ id: tenant.id }, { commanderDisabledCapabilities: disabled });

  // Invalida o cache de /api/me/entitlements (60s TTL) — senão o efeito demora a aparecer
  // pra todo mundo do tenant (a preferência é do workspace, não só de quem clicou).
  await redisDeleteByPrefix(`entitlements:${tenant.id}:`);

  return NextResponse.json({ ok: true, disabled });
}
