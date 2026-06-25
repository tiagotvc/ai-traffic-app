import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { getAiCreditsFeatureFlags } from "@/lib/ai-credits/feature-flags";
import { getAgencyBrainAiStatus } from "@/lib/creative-memory/ai-usage";

export async function GET() {
  try {
    const { tenant } = await getAppContext();
    const [status, featureFlags] = await Promise.all([
      getAgencyBrainAiStatus(tenant.id),
      getAiCreditsFeatureFlags()
    ]);
    return NextResponse.json({
      ok: true,
      ...status,
      agentLayerEnabled: featureFlags.agentLayerEnabled
    });
  } catch (err) {
    console.error("[agency-brain ai-status]", err);
    return NextResponse.json({ ok: false, error: "Erro ao carregar status de IA" }, { status: 500 });
  }
}
