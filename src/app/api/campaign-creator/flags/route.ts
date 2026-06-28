import { NextResponse } from "next/server";

import { isPlatformFeatureEnabled } from "@/lib/feature-flags/service";

/** Flags do módulo Campanhas para o client (criador, Orion Brain, IA). */
export async function GET() {
  const [
    metaAppDevelopmentNotice,
    brain,
    brainSidebar,
    brainInsights,
    brainMetaResearch,
    aiGenerate,
    aiCopy
  ] = await Promise.all([
    isPlatformFeatureEnabled("campaigns.meta-app-development-notice"),
    isPlatformFeatureEnabled("campaigns.brain"),
    isPlatformFeatureEnabled("campaigns.brain.sidebar"),
    isPlatformFeatureEnabled("campaigns.brain.insights"),
    isPlatformFeatureEnabled("campaigns.brain.meta-research"),
    isPlatformFeatureEnabled("campaigns.ai-generate"),
    isPlatformFeatureEnabled("campaigns.ai-copy")
  ]);

  return NextResponse.json({
    ok: true,
    metaAppDevelopmentNotice,
    brain,
    brainSidebar,
    brainInsights,
    brainMetaResearch,
    aiGenerate,
    aiCopy
  });
}
