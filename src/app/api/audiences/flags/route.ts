import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { isPlatformFeatureEnabled } from "@/lib/feature-flags/service";

/** Flags do módulo de públicos para o client (persona insights × editor de segmentos × cientista). */
export async function GET() {
  const { tenant } = await getAppContext();
  const [personaInsights, personaTargetingBuilder, marketingScientistPlatform] = await Promise.all([
    isPlatformFeatureEnabled("audiences.personaInsights"),
    isPlatformFeatureEnabled("audiences.personaTargetingBuilder"),
    isPlatformFeatureEnabled("commander.scientists.competitor")
  ]);
  const userDisabled = new Set(tenant.commanderDisabledCapabilities ?? []);
  const marketingScientist =
    marketingScientistPlatform &&
    !userDisabled.has("commander") &&
    !userDisabled.has("commander.scientists.competitor");

  return NextResponse.json({
    ok: true,
    personaInsights,
    personaTargetingBuilder,
    marketingScientist
  });
}
