import { NextResponse } from "next/server";
import { z } from "zod";

import { apiErrorResponse, requireAppShellContext } from "@/lib/api-auth";
import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { MAX_CREATIVE_IMAGE_BYTES } from "@/lib/creative-upload-limits";
import { createVideoUploadSession } from "@/lib/video-upload-session";

const BodySchema = z.object({
  clientId: z.string().min(1),
  adAccountId: z.string().min(1),
  label: z.string().min(1),
  fileName: z.string().min(1),
  totalSize: z.number().int().positive(),
  totalChunks: z.number().int().positive()
});

export const maxDuration = 30;
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    await requireAppShellContext();
    const { tenant } = await getAppContext();
    const body = BodySchema.parse(await req.json().catch(() => ({})));

    if (body.totalSize > MAX_CREATIVE_IMAGE_BYTES) {
      return NextResponse.json(
        { ok: false, error: "Imagem muito grande (máx. 30 MB)" },
        { status: 400 }
      );
    }

    const client = await getClientBySlugOrId(tenant.id, body.clientId);
    if (!client) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    const session = await createVideoUploadSession({
      tenantId: tenant.id,
      clientId: body.clientId,
      adAccountId: body.adAccountId,
      label: body.label,
      fileName: body.fileName,
      totalSize: body.totalSize,
      totalChunks: body.totalChunks
    });

    return NextResponse.json({ ok: true, uploadId: session.uploadId });
  } catch (err) {
    const authResponse = apiErrorResponse(err, "creative-assets/image/init");
    if (authResponse.status !== 500) return authResponse;
    const message = err instanceof Error ? err.message : "Falha ao iniciar envio";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
