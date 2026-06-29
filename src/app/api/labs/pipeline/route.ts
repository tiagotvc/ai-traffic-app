import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { persistTestingHypotheses } from "@/lib/labs/persist-hypotheses";
import { runResearchPipeline, runResearchWithTesting } from "@/lib/labs/pipelines/runner";

const BodySchema = z.object({
  pipelineId: z.string().min(1),
  niche: z.string().max(300).optional(),
  marketCountry: z.string().max(8).optional(),
  briefing: z.string().max(2000).optional(),
  region: z.string().max(200).optional(),
  places: z.array(z.string().max(160)).max(40).optional(),
  geoLocations: z
    .array(
      z.object({
        label: z.string().max(160).optional(),
        latitude: z.number(),
        longitude: z.number(),
        radius: z.number()
      })
    )
    .max(50)
    .optional(),
  competitors: z
    .array(z.object({ name: z.string().max(160), pageId: z.string().max(60).optional() }))
    .max(20)
    .optional(),
  /** Quando presente, o servidor preenche nicho/país pelo cliente e pode persistir hipóteses. */
  clientSlug: z.string().max(120).optional(),
  persistHypotheses: z.boolean().optional()
});

/** Roda uma pipeline de pesquisa e devolve o dossiê consolidado (read-only). */
export async function POST(req: Request) {
  const { tenant } = await getAppContext(); // exige sessão
  const body = BodySchema.parse(await req.json().catch(() => ({})));

  // Resolve o cliente (preenche nicho/país a partir do cadastro).
  const client = body.clientSlug ? await getClientBySlugOrId(tenant.id, body.clientSlug) : null;

  const input = {
    niche: client?.niche ?? body.niche ?? null,
    marketCountry: client?.marketCountry ?? body.marketCountry ?? null,
    briefing: body.briefing ?? null,
    region: body.region ?? null,
    places: body.places ?? [],
    geoLocations: body.geoLocations ?? [],
    competitors: body.competitors ?? []
  };

  // "full" = dossiê completo (marketing + geo + Testing Scientist).
  const dossier =
    body.pipelineId === "full"
      ? await runResearchWithTesting(input)
      : await runResearchPipeline(body.pipelineId, input);

  if (!dossier) {
    return NextResponse.json({ ok: false, reason: "unknown_pipeline" }, { status: 400 });
  }

  if (body.persistHypotheses && client) {
    await persistTestingHypotheses(tenant.id, client.id, dossier);
  }

  return NextResponse.json({ ok: true, dossier });
}
