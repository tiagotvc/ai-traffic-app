import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext } from "@/lib/app-context";
import { checkCustomAudienceTos, validateClientAdAccount } from "@/lib/audience-api-helpers";
import { summarizePlan } from "@/lib/audiences/bulk/builders";
import { resolveBulkPlan } from "@/lib/audiences/bulk/execute.server";
import { BULK_MAX_AUDIENCES, BulkAudienceConfigSchema } from "@/lib/audiences/bulk/types";
import { formatMetaGraphError } from "@/lib/meta-error";

export const maxDuration = 30;

const BodySchema = z.object({
  clientId: z.string().min(1),
  adAccountId: z.string().min(1),
  config: BulkAudienceConfigSchema
});

/** Monta o plano do lote (combinações + nomes + duplicidade) sem criar nada. */
export async function POST(req: Request) {
  const { tenant, metaAccessToken } = await getAppContext();
  if (!metaAccessToken) {
    return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Configuração inválida" }, { status: 400 });
  }
  const body = parsed.data;

  const validation = await validateClientAdAccount(tenant.id, body.clientId, body.adAccountId);
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: validation.status });
  }

  const tos = await checkCustomAudienceTos(metaAccessToken, body.adAccountId);
  if (!tos.accepted) {
    return NextResponse.json(
      { ok: false, error: "Aceite os termos de públicos personalizados na Meta", tosUrl: tos.url },
      { status: 403 }
    );
  }

  try {
    const { plan, missingSeedIds } = await resolveBulkPlan(
      metaAccessToken,
      body.adAccountId,
      body.config
    );
    if (missingSeedIds.length) {
      return NextResponse.json(
        { ok: false, error: "Algum público-base não existe mais nesta conta. Atualize a lista." },
        { status: 409 }
      );
    }
    if (plan.length > BULK_MAX_AUDIENCES) {
      return NextResponse.json(
        { ok: false, error: `Máximo de ${BULK_MAX_AUDIENCES} públicos por lote` },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true, plan, summary: summarizePlan(plan) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: formatMetaGraphError(e) }, { status: 502 });
  }
}
