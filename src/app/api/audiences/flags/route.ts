import { NextResponse } from "next/server";

import { isPlatformFeatureEnabled } from "@/lib/feature-flags/service";

/** Flags do módulo de públicos para o client (persona insights × editor de segmentos × cientista). */
export async function GET() {
  const [personaInsights, personaTargetingBuilder, marketingScientist] = await Promise.all([
    isPlatformFeatureEnabled("audiences.personaInsights"),
    isPlatformFeatureEnabled("audiences.personaTargetingBuilder"),
    isPlatformFeatureEnabled("scientists.competitor")
  ]);
  return NextResponse.json({
    ok: true,
    personaInsights,
    personaTargetingBuilder,
    marketingScientist
  });
}
