import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { canUseCommander } from "@/lib/commander/access";
import { isPlatformFeatureEnabled } from "@/lib/feature-flags/service";
import { resetCommanderConversation } from "@/lib/commander/conversation";

const BodySchema = z.object({ clientSlug: z.string().min(1) });

/** Limpa a conversa persistida do cliente — usuário recomeçando do zero. */
export async function POST(req: Request) {
  try {
    const { tenant, user, platformAdmin, entitlements } = await getAppContext();
    const body = BodySchema.parse(await req.json().catch(() => ({})));

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

    const client = await getClientBySlugOrId(tenant.id, body.clientSlug);
    if (!client) {
      return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
    }

    await resetCommanderConversation(tenant.id, client.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: "clientSlug inválido" }, { status: 400 });
    }
    console.error("[commander conversation reset]", err);
    return NextResponse.json({ ok: false, error: "Erro ao reiniciar a conversa" }, { status: 500 });
  }
}
