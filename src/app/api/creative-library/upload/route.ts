import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext } from "@/lib/app-context";
import { repositories } from "@/db/repositories";
import { assertFeatureEnabled, FeatureDisabledError } from "@/lib/feature-flags/service";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  imageBase64: z.string().min(100),
  mimeType: z.string().default("image/png"),
  headline: z.string().max(90).default(""),
  body: z.string().max(300).default("")
});

/** Salva uma edição feita no Creative Canvas (imagem importada, não gerada por IA) direto
 * no histórico privado — sem cliente associado (`clientId: null`), sem custo de crédito. */
export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json().catch(() => ({})));
    const { tenant, user } = await getAppContext();
    await assertFeatureEnabled("creative-studio");

    const { creativeLibraryItem } = await repositories();
    const item = await creativeLibraryItem.save(
      creativeLibraryItem.create({
        tenantId: tenant.id,
        clientId: null,
        createdByUserId: user.id,
        headline: body.headline || "Imagem editada no Canvas",
        body: body.body,
        format: "feed",
        style: "photo",
        mimeType: body.mimeType,
        imageData: Buffer.from(body.imageBase64, "base64"),
        visibility: "private"
      })
    );

    return NextResponse.json({ ok: true, id: item.id });
  } catch (err) {
    if (err instanceof FeatureDisabledError) {
      return NextResponse.json({ ok: false, error: "Recurso desabilitado" }, { status: 403 });
    }
    console.error("[creative-library upload]", err);
    return NextResponse.json({ ok: false, error: "Não foi possível salvar na biblioteca." }, { status: 500 });
  }
}
