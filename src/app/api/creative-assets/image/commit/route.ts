import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { apiErrorResponse, requireAppShellContext } from "@/lib/api-auth";
import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { uploadAdImageBytes } from "@/lib/meta-graph";
import {
  destroyVideoUploadSession,
  getVideoUploadSession,
  readAssembledVideo
} from "@/lib/video-upload-session";

const BodySchema = z.object({
  uploadId: z.string().uuid()
});

export const maxDuration = 120;
export const runtime = "nodejs";

export async function POST(req: Request) {
  let uploadId: string | undefined;

  try {
    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "uploadId inválido" }, { status: 400 });
    }
    uploadId = parsed.data.uploadId;

    await requireAppShellContext();
    const { tenant, metaAccessToken } = await getAppContext();
    if (!metaAccessToken) {
      return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
    }

    const session = await getVideoUploadSession(uploadId);
    if (!session || session.tenantId !== tenant.id) {
      return NextResponse.json({ ok: false, error: "Sessão de upload inválida ou expirada" }, { status: 404 });
    }

    const client = await getClientBySlugOrId(tenant.id, session.clientId);
    if (!client) {
      return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
    }

    const buffer = await readAssembledVideo(session);
    const uploaded = await uploadAdImageBytes(
      metaAccessToken,
      session.adAccountId,
      buffer,
      session.fileName,
      session.label
    );
    const hash = Object.values(uploaded.images ?? {})[0]?.hash;
    if (!hash) {
      throw new Error("A Meta não retornou o hash da imagem");
    }

    const { creativeAsset: repo } = await repositories();
    await repo.save(
      repo.create({
        clientId: client.id,
        metaAdAccountId: session.adAccountId,
        metaImageHash: hash,
        label: session.label
      })
    );

    await destroyVideoUploadSession(uploadId);

    return NextResponse.json({ ok: true, hash, label: session.label });
  } catch (err) {
    if (uploadId) await destroyVideoUploadSession(uploadId).catch(() => undefined);
    const authResponse = apiErrorResponse(err, "creative-assets/image/commit");
    if (authResponse.status !== 500) return authResponse;
    const message = err instanceof Error ? err.message : "Falha ao enviar imagem";
    console.error("[creative-assets/image/commit]", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
