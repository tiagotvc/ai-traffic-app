import { NextResponse } from "next/server";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { canUseCommander } from "@/lib/commander/access";
import { isPlatformFeatureEnabled } from "@/lib/feature-flags/service";
import { loadCommanderConversationMessages } from "@/lib/commander/conversation";

/** Hidrata a UI do chat do Commander com a conversa persistida do cliente. */
export async function GET(req: Request) {
  try {
    const { tenant, user, platformAdmin, entitlements } = await getAppContext();
    const clientSlug = new URL(req.url).searchParams.get("clientSlug");
    if (!clientSlug) {
      return NextResponse.json({ ok: false, error: "clientSlug obrigatório" }, { status: 400 });
    }

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

    const client = await getClientBySlugOrId(tenant.id, clientSlug);
    if (!client) {
      return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
    }

    const messages = await loadCommanderConversationMessages(tenant.id, client.id);
    return NextResponse.json({ ok: true, messages });
  } catch (err) {
    console.error("[commander conversation get]", err);
    return NextResponse.json({ ok: false, error: "Erro ao carregar a conversa" }, { status: 500 });
  }
}
