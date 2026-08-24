import { NextResponse } from "next/server";

import { requireAppShellContext } from "@/lib/api-auth";
import { getEntitlements } from "@/lib/billing/entitlements";
import { canUseCommander } from "@/lib/commander/access";
import { isPlatformFeatureEnabled } from "@/lib/feature-flags/service";

/** Flags do módulo Campanhas para o client (criador, Commander e IA). */
export async function GET() {
  const { tenant, user, platformAdmin } = await requireAppShellContext();
  const context = { userId: user.id, isPlatformAdmin: platformAdmin };
  const [
    commanderPlatform,
    commanderMemory,
    metaAppDevelopmentNotice,
    aiGenerate,
    aiCopy
  ] = await Promise.all([
    isPlatformFeatureEnabled("commander.modules.campaigns", context),
    isPlatformFeatureEnabled("commander.memory", context),
    isPlatformFeatureEnabled("campaigns.meta-app-development-notice"),
    isPlatformFeatureEnabled("campaigns.ai-generate"),
    isPlatformFeatureEnabled("campaigns.ai-copy")
  ]);
  const entitlements = await getEntitlements(tenant.id, { platformAdmin, userId: user.id });
  const userDisabled = new Set(tenant.commanderDisabledCapabilities ?? []);
  const commander = canUseCommander({
    planSlug: entitlements.planSlug,
    allowCommander: entitlements.limits.allowCommander,
    platformEnabled: commanderPlatform,
    environmentEnabled: process.env.ENABLE_COMMANDER !== "false",
    platformAdmin,
    userEnabled: !userDisabled.has("commander") && !userDisabled.has("commander.modules.campaigns")
  });

  return NextResponse.json({
    ok: true,
    commander,
    commanderMemory: commander && commanderMemory && !userDisabled.has("commander.memory"),
    // "Modo direto" (config em /commander): dicas óbvias de preenchimento ("adicione
    // uma mídia") só valem a pena pra quem tá começando — o padrão já vem desligado
    // pra Advanced/Agency (que já conhecem o fluxo) e ligado só pro Individual. O
    // toggle em Configurações inverte esse padrão pra quem quiser o oposto (XOR).
    commanderStructuralInsights:
      (entitlements.planSlug === "basic") !== userDisabled.has("commander.insights.structural"),
    metaAppDevelopmentNotice,
    aiGenerate,
    aiCopy
  });
}
