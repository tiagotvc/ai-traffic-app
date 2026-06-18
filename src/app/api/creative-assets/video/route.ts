import { NextResponse } from "next/server";

import { apiErrorResponse, requireAppShellContext } from "@/lib/api-auth";
import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { MAX_CREATIVE_VIDEO_BYTES } from "@/lib/creative-upload-limits";
import { uploadAdVideo } from "@/lib/meta-graph";

export const maxDuration = 120;
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    await requireAppShellContext();
    const { tenant, metaAccessToken } = await getAppContext();
    if (!metaAccessToken) {
      return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
    }

    const form = await req.formData();
    const clientId = String(form.get("clientId") ?? "").trim();
    const adAccountId = String(form.get("adAccountId") ?? "").trim();
    const label = String(form.get("label") ?? "").trim();
    const file = form.get("file");

    if (!clientId || !adAccountId) {
      return NextResponse.json({ ok: false, error: "clientId e adAccountId obrigatórios" }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Arquivo de vídeo obrigatório" }, { status: 400 });
    }
    if (file.size > MAX_CREATIVE_VIDEO_BYTES) {
      return NextResponse.json({ ok: false, error: "Vídeo muito grande (máx. 100 MB)" }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ ok: false, error: "Arquivo de vídeo vazio ou corrompido" }, { status: 400 });
    }

    const client = await getClientBySlugOrId(tenant.id, clientId);
    if (!client) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadAdVideo(
      metaAccessToken,
      adAccountId,
      buffer,
      file.name,
      label || file.name
    );

    return NextResponse.json({
      ok: true,
      videoId: uploaded.id,
      label: label || file.name
    });
  } catch (err) {
    const authResponse = apiErrorResponse(err, "creative-assets/video");
    if (authResponse.status !== 500) return authResponse;
    const message = err instanceof Error ? err.message : "Falha ao enviar vídeo";
    console.error("[creative-assets/video]", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
