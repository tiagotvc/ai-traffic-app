import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import {
  countAgencyHypotheses,
  countAgencyLearningsShelf
} from "@/lib/agency-brain/brain-summary-service";

export async function GET() {
  try {
    const { tenant } = await getAppContext();
    const [learningsCount, hypothesesCount] = await Promise.all([
      countAgencyLearningsShelf(tenant.id),
      countAgencyHypotheses(tenant.id)
    ]);
    return NextResponse.json({ ok: true, learningsCount, hypothesesCount });
  } catch (err) {
    console.error("[dashboard/brain-summary GET]", err);
    return NextResponse.json(
      { ok: false, error: "Erro ao carregar resumo do Agency Brain" },
      { status: 500 }
    );
  }
}
