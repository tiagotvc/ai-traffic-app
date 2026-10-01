import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";
import { validateClientAdAccount } from "@/lib/audience-api-helpers";
import { executeBulkChunk, resolveBulkPlan } from "@/lib/audiences/bulk/execute.server";
import { BULK_CREATE_CHUNK_SIZE, BulkAudienceConfigSchema } from "@/lib/audiences/bulk/types";
import { formatMetaGraphError } from "@/lib/meta-error";

export const maxDuration = 60;

const BodySchema = z.object({
  clientId: z.string().min(1),
  adAccountId: z.string().min(1),
  config: BulkAudienceConfigSchema,
  keys: z.array(z.string().min(1)).min(1).max(BULK_CREATE_CHUNK_SIZE),
  /** Vídeos que a Meta já recusou em trechos anteriores (sem Página). */
  rejectedVideoIds: z.array(z.string().min(1)).max(1000).default([])
});

/**
 * Cria um trecho do lote. O plano é refeito a partir da configuração a cada
 * chamada: nomes e duplicidade vêm sempre do servidor e da conta atual,
 * nunca do navegador.
 */
export async function POST(req: Request) {
  const { tenant, metaAccessToken } = await getAppContext();
  if (!metaAccessToken) {
    return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Requisição inválida" }, { status: 400 });
  }
  const body = parsed.data;

  const validation = await validateClientAdAccount(tenant.id, body.clientId, body.adAccountId);
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: validation.status });
  }

  try {
    const { plan } = await resolveBulkPlan(metaAccessToken, body.adAccountId, body.config);
    const byKey = new Map(plan.map((p) => [p.key, p]));
    const items = body.keys.flatMap((k) => {
      const item = byKey.get(k);
      return item ? [item] : [];
    });
    if (!items.length) {
      return NextResponse.json({ ok: false, error: "Itens fora do plano" }, { status: 400 });
    }

    const { results, rejectedVideoIds } = await executeBulkChunk(
      metaAccessToken,
      body.adAccountId,
      items,
      validation.clientName,
      body.rejectedVideoIds
    );

    // Sem isso a lista de Públicos Meta seguiria no cache (TTL 30 min) sem os novos.
    if (results.some((r) => r.status === "created")) {
      const { metaAudienceCache } = await repositories();
      await metaAudienceCache.delete({ metaAdAccountId: body.adAccountId });
    }

    return NextResponse.json({ ok: true, results, rejectedVideoIds });
  } catch (e) {
    return NextResponse.json({ ok: false, error: formatMetaGraphError(e) }, { status: 502 });
  }
}
