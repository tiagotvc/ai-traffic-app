import { NextResponse } from "next/server";

import { apiErrorResponse, requireAppShellContext } from "@/lib/api-auth";
import { getAppContext } from "@/lib/app-context";
import { getVideoUploadSession, saveVideoUploadPart } from "@/lib/video-upload-session";

export const maxDuration = 60;
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    await requireAppShellContext();
    const { tenant } = await getAppContext();

    const form = await req.formData();
    const uploadId = String(form.get("uploadId") ?? "").trim();
    const partIndex = Number(form.get("partIndex"));
    const chunk = form.get("chunk");

    if (!uploadId || !Number.isInteger(partIndex) || partIndex < 0) {
      return NextResponse.json({ ok: false, error: "uploadId e partIndex obrigatórios" }, { status: 400 });
    }
    if (!(chunk instanceof File)) {
      return NextResponse.json({ ok: false, error: "Parte do arquivo obrigatória" }, { status: 400 });
    }

    const session = await getVideoUploadSession(uploadId);
    if (!session || session.tenantId !== tenant.id) {
      return NextResponse.json({ ok: false, error: "Sessão de upload inválida ou expirada" }, { status: 404 });
    }

    const buffer = Buffer.from(await chunk.arrayBuffer());
    const updated = await saveVideoUploadPart(session, partIndex, buffer);

    return NextResponse.json({
      ok: true,
      received: updated.receivedParts.length,
      totalChunks: updated.totalChunks
    });
  } catch (err) {
    const authResponse = apiErrorResponse(err, "creative-assets/video/part");
    if (authResponse.status !== 500) return authResponse;
    const message = err instanceof Error ? err.message : "Falha ao enviar parte";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
