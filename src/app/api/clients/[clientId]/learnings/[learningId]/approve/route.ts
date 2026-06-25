import { NextResponse } from "next/server";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { approveLearning, getLearningById } from "@/lib/agency-brain/client-learning-service";
import { rebuildClientDna } from "@/lib/agency-brain/dna-builder";
import { recordTimelineEvent } from "@/lib/agency-brain/timeline-service";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ clientId: string; learningId: string }> }
) {
  try {
    const { clientId, learningId } = await params;
    const body = (await req.json().catch(() => ({}))) as { force?: boolean };
    const forceApprove = body.force === true;
    const { tenant } = await getAppContext();
    const client = await getClientBySlugOrId(tenant.id, clientId);
    if (!client) {
      return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
    }

    const existing = await getLearningById(tenant.id, client.id, learningId);
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Aprendizado não encontrado" }, { status: 404 });
    }

    const score = existing.confidenceScore ?? 0;
    if (score < 50 && !forceApprove) {
      return NextResponse.json(
        {
          ok: false,
          code: "LOW_CONFIDENCE",
          error: `Confiança insuficiente (${score}/100). Mínimo 50 para aprovar.`
        },
        { status: 400 }
      );
    }

    const learning = await approveLearning(tenant.id, client.id, learningId);
    if (!learning) {
      return NextResponse.json({ ok: false, error: "Aprendizado não encontrado" }, { status: 404 });
    }

    await recordTimelineEvent(tenant.id, client.id, {
      type: "learning_approved",
      title: learning.title,
      description: learning.description,
      sourceId: learning.id,
      sourceType: "learning"
    });
    await rebuildClientDna(tenant.id, client.id);

    return NextResponse.json({ ok: true, learning });
  } catch (err) {
    console.error("[learning approve]", err);
    return NextResponse.json({ ok: false, error: "Erro ao aprovar" }, { status: 500 });
  }
}
