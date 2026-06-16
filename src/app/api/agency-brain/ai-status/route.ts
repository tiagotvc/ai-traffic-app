import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { getAgencyBrainAiStatus } from "@/lib/creative-memory/ai-usage";

export async function GET() {
  try {
    const { tenant } = await getAppContext();
    const status = await getAgencyBrainAiStatus(tenant.id);
    return NextResponse.json({ ok: true, ...status });
  } catch (err) {
    console.error("[agency-brain ai-status]", err);
    return NextResponse.json({ ok: false, error: "Erro ao carregar status de IA" }, { status: 500 });
  }
}
