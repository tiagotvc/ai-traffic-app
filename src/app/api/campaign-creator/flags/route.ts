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
    isPlatformFeatureEnabled("campaigns.commander", context),
    isPlatformFeatureEnabled("campaigns.commander.memory", context),
    isPlatformFeatureEnabled("campaigns.meta-app-development-notice"),
    isPlatformFeatureEnabled("campaigns.ai-generate"),
    isPlatformFeatureEnabled("campaigns.ai-copy")
  ]);
  const entitlements = await getEntitlements(tenant.id, { platformAdmin, userId: user.id });
  const commander = canUseCommander({
    planSlug: entitlements.planSlug,
    allowCommander: entitlements.limits.allowCommander,
    platformEnabled: commanderPlatform,
    environmentEnabled: process.env.ENABLE_COMMANDER !== "false",
    platformAdmin
  });

  return NextResponse.json({
    ok: true,
    commander,
    commanderMemory: commander && commanderMemory,
    metaAppDevelopmentNotice,
    aiGenerate,
    aiCopy
  });
}
