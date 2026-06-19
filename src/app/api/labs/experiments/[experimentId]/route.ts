import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { assertLabsAccess, labsUnavailableResponse } from "@/lib/labs/access";
import {
  getLabsExperiment,
  listLabsAgentRuns
} from "@/lib/labs/experiment-service";
import { isLabsEnabledForUser } from "@/lib/labs/feature-flag";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ experimentId: string }> }
) {
  try {
    const ctx = await getAppContext();
    if (!isLabsEnabledForUser(ctx.platformAdmin)) {
      return labsUnavailableResponse();
    }

    const billingBlock = await assertLabsAccess(ctx);
    if (billingBlock) return billingBlock;

    const { experimentId } = await params;
    const { tenant } = ctx;

    const experiment = await getLabsExperiment(tenant.id, experimentId);
    if (!experiment) {
      return NextResponse.json({ ok: false, error: "Experimento não encontrado" }, { status: 404 });
    }

    const runs = await listLabsAgentRuns(experimentId);
    return NextResponse.json({ ok: true, experiment, runs });
  } catch (err) {
    console.error("[labs/experiments/:id GET]", err);
    return NextResponse.json({ ok: false, error: "Erro ao carregar experimento" }, { status: 500 });
  }
}
