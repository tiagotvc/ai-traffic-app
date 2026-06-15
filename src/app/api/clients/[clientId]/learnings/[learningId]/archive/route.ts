import { NextResponse } from "next/server";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { archiveLearning } from "@/lib/agency-brain/client-learning-service";

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

    const learning = await archiveLearning(tenant.id, client.id, learningId);
    if (!learning) {
      return NextResponse.json({ ok: false, error: "Aprendizado não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, learning });
  } catch (err) {
    console.error("[learning archive]", err);
    return NextResponse.json({ ok: false, error: "Erro ao arquivar" }, { status: 500 });
  }
}
