import { NextResponse } from "next/server";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import {
  deleteLearning,
  updateLearning
} from "@/lib/agency-brain/client-learning-service";
import { UpdateLearningSchema } from "@/lib/agency-brain/schemas";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ clientId: string; learningId: string }> }
) {
  try {
    const { clientId, learningId } = await params;
    const { tenant } = await getAppContext();
    const client = await getClientBySlugOrId(tenant.id, clientId);
    if (!client) {
      return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
    }

    const body = UpdateLearningSchema.parse(await req.json());
    const learning = await updateLearning(tenant.id, client.id, learningId, body);
    if (!learning) {
      return NextResponse.json({ ok: false, error: "Aprendizado não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, learning });
  } catch (err) {
    console.error("[learning PATCH]", err);
    return NextResponse.json({ ok: false, error: "Erro ao atualizar" }, { status: 400 });
  }
}

export async function DELETE(
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

    const deleted = await deleteLearning(tenant.id, client.id, learningId);
    if (!deleted) {
      return NextResponse.json({ ok: false, error: "Aprendizado não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[learning DELETE]", err);
    return NextResponse.json({ ok: false, error: "Erro ao remover" }, { status: 500 });
  }
}
