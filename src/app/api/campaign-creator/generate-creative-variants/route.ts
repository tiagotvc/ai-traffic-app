import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext } from "@/lib/app-context";
import { fetchImageAsBase64, generateImageVariants } from "@/lib/gemini-image";
import { uploadAdImage } from "@/lib/meta-graph";
import { assertFeatureEnabled, FeatureDisabledError } from "@/lib/feature-flags/service";

const BodySchema = z.object({
  adAccountId: z.string().min(1),
  sourceImageHash: z.string().optional(),
  sourceImageUrl: z.string().url().optional(),
  prompt: z.string().optional(),
  variantCount: z.number().min(2).max(4).default(2)
});

export async function POST(req: Request) {
  try {
    await assertFeatureEnabled("campaigns.ai-copy");

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: "AI_NOT_CONFIGURED" }, { status: 503 });
    }

    const { metaAccessToken } = await getAppContext();
    if (!metaAccessToken) {
      return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
    }

    const body = BodySchema.parse(await req.json().catch(() => ({})));
    if (!body.sourceImageUrl && !body.sourceImageHash) {
      return NextResponse.json(
        { ok: false, error: "sourceImageUrl or sourceImageHash required" },
        { status: 400 }
      );
    }

    let imageUrl = body.sourceImageUrl;
    if (!imageUrl && body.sourceImageHash) {
      return NextResponse.json(
        {
          ok: false,
          error: "IMAGE_URL_REQUIRED",
          message: "Forneça sourceImageUrl junto com o hash para gerar variações."
        },
        { status: 400 }
      );
    }

    const { base64, mimeType } = await fetchImageAsBase64(imageUrl!);
    const variants = await generateImageVariants({
      apiKey,
      sourceImageBase64: base64,
      mimeType,
      prompt: body.prompt,
      count: body.variantCount
    });

    const hashes: Array<{ hash: string; label: string }> = [];
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i]!;
      const dataUrl = `data:${v.mimeType};base64,${v.imageBase64}`;
      const uploaded = await uploadAdImage(
        metaAccessToken,
        body.adAccountId,
        dataUrl,
        `AI variant ${i + 1}`
      );
      const hash = Object.values(uploaded.images ?? {})[0]?.hash;
      if (hash) hashes.push({ hash, label: `Variação IA ${i + 1}` });
    }

    return NextResponse.json({ ok: true, variants: hashes });
  } catch (err) {
    if (err instanceof FeatureDisabledError) {
      return NextResponse.json({ ok: false, error: "Recurso desabilitado" }, { status: 403 });
    }
    const msg = err instanceof Error ? err.message : "Imagen error";
    const isUnavailable = msg.toLowerCase().includes("imagen unavailable");
    return NextResponse.json(
      {
        ok: false,
        error: isUnavailable ? "IMAGEN_UNAVAILABLE" : msg,
        message: isUnavailable
          ? "Geração de imagem por IA indisponível. Use upload manual."
          : msg
      },
      { status: isUnavailable ? 503 : 500 }
    );
  }
}
