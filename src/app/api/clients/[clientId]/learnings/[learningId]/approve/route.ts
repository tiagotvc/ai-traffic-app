import { NextResponse } from "next/server";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { approveLearning } from "@/lib/agency-brain/client-learning-service";
import { rebuildClientDna } from "@/lib/agency-brain/dna-builder";
import { recordTimelineEvent } from "@/lib/agency-brain/timeline-service";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ clientId: string; learningId: string }> }
) {
  try {
    const { clientId, learningId } = await params;
    const { tenant } = await getAppContext();
    const client = await getClientBySlugOrId(tenant.id, clientId);
    if (!client) {
      return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
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
