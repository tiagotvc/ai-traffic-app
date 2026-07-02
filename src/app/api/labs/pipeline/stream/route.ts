import { z } from "zod";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { assertCommanderScientistsAccess } from "@/lib/billing/entitlements";
import { billingErrorResponse } from "@/lib/billing/api-errors";
import { estimateGeoReach } from "@/lib/labs/geo-reach";
import { persistTestingHypotheses } from "@/lib/labs/persist-hypotheses";
import { runFullResearch, type FullResearchOptions } from "@/lib/labs/pipelines/runner";
import type { PipelineEvent } from "@/lib/labs/pipelines/types";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  scope: z.enum(["campaign", "persona", "zone", "full"]).optional(),
  niche: z.string().max(2000).optional(),
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
  clientSlug: z.string().max(120).optional(),
  persistHypotheses: z.boolean().optional(),
  /** Campaign creator wizard step — scopes scientists when scope=campaign */
  activeNode: z.enum(["campaign", "adset", "ad", "review"]).optional(),
  draftId: z.string().max(80).optional()
});

/**
 * Pipeline com PROGRESSO em tempo real (SSE). `scope` define os cientistas-base
 * (campaign=marketing+geo, persona=marketing, zone=geo) + Testing. Emite eventos por
 * cientista, o reach (zona) e o dossiê. Persiste hipóteses do Testing (best-effort).
 */
export async function POST(req: Request) {
  const { tenant, metaAccessToken } = await getAppContext(); // exige sessão

  // Gate do Copilot antes de abrir o stream (resposta JSON 402 se indisponível).
  let maxScientists: number;
  try {
    const ent = await assertCommanderScientistsAccess(tenant.id);
    maxScientists = ent.limits.maxScientists;
  } catch (err) {
    const res = billingErrorResponse(err);
    if (res) return res;
    throw err;
  }

  const body = BodySchema.parse(await req.json().catch(() => ({})));
  const scope = body.scope ?? "full";
  const client = body.clientSlug ? await getClientBySlugOrId(tenant.id, body.clientSlug) : null;

  const input = {
    niche: client?.niche ?? body.niche ?? null,
    marketCountry: client?.marketCountry ?? body.marketCountry ?? null,
    briefing: body.briefing ?? null,
    region: body.region ?? null,
    places: body.places ?? [],
    geoLocations: body.geoLocations ?? [],
    competitors: []
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: PipelineEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
        } catch {
          /* stream fechado */
        }
      };
      try {
        const options: FullResearchOptions =
          scope === "campaign"
            ? {
                wizardStep: body.activeNode ?? "campaign",
                draftId: body.draftId ?? null,
                clientId: client?.id ?? null,
                maxScientists
              }
            : { maxScientists };
        const dossier = await runFullResearch(input, send, scope, options);
        if (scope === "zone" && (body.geoLocations?.length ?? 0) > 0) {
          const reach = await estimateGeoReach(tenant.id, metaAccessToken, body.geoLocations!);
          if (reach) send({ phase: "reach", reach });
        }
        if (body.persistHypotheses && client) {
          await persistTestingHypotheses(tenant.id, client.id, dossier);
        }
      } catch {
        send({
          phase: "done",
          dossier: { pipelineId: scope, label: "Pesquisa", sections: [], suggestions: [], skipped: [] }
        });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
