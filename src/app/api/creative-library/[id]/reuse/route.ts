import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { getCommunityItemForReuse, saveReusedVariant } from "@/lib/creative-studio/library";
import { assertFeatureEnabled, FeatureDisabledError } from "@/lib/feature-flags/service";

export const dynamic = "force-dynamic";

const BodySchema = z.object({ clientSlug: z.string().min(1) });

/**
 * Reusar um item comunitário não custa crédito de IA — não gera nada novo, só copia
 * imagem+copy de outro tenant pro histórico privado daquele cliente, com `sourceItemId`
 * preenchido (proveniência pro futuro crédito de recompensa quando virar campanha real).
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = BodySchema.parse(await req.json().catch(() => ({})));
    const { tenant, user } = await getAppContext();
    await assertFeatureEnabled("creative-studio");

    const client = await getClientBySlugOrId(tenant.id, body.clientSlug);
    if (!client) {
      return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
    }

    const source = await getCommunityItemForReuse(id);
    if (!source) {
      return NextResponse.json({ ok: false, error: "Item não encontrado na comunidade" }, { status: 404 });
    }

    await saveReusedVariant({
      tenantId: tenant.id,
      clientId: client.id,
      createdByUserId: user.id,
      format: "feed",
      style: "photo",
      sourceItemId: id,
      variant: source
    });

    return NextResponse.json({ ok: true, ...source });
  } catch (err) {
    if (err instanceof FeatureDisabledError) {
      return NextResponse.json({ ok: false, error: "Recurso desabilitado" }, { status: 403 });
    }
    console.error("[creative-library reuse]", err);
    return NextResponse.json({ ok: false, error: "Não foi possível reusar esse item agora." }, { status: 500 });
  }
}
