import { z } from "zod";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { persistTestingHypotheses } from "@/lib/labs/persist-hypotheses";
import { runFullResearch } from "@/lib/labs/pipelines/runner";
import type { PipelineEvent } from "@/lib/labs/pipelines/types";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  niche: z.string().max(300).optional(),
  marketCountry: z.string().max(8).optional(),
  briefing: z.string().max(2000).optional(),
  clientSlug: z.string().max(120).optional(),
  persistHypotheses: z.boolean().optional()
});

/**
 * Pipeline completa com PROGRESSO em tempo real (SSE). Emite eventos por cientista
 * (start/done) e, no fim, o dossiê. Persiste hipóteses do Testing (best-effort).
 */
export async function POST(req: Request) {
  const { tenant } = await getAppContext(); // exige sessão
  const body = BodySchema.parse(await req.json().catch(() => ({})));
  const client = body.clientSlug ? await getClientBySlugOrId(tenant.id, body.clientSlug) : null;

  const input = {
    niche: client?.niche ?? body.niche ?? null,
    marketCountry: client?.marketCountry ?? body.marketCountry ?? null,
    briefing: body.briefing ?? null,
    places: [],
    geoLocations: [],
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
        const dossier = await runFullResearch(input, send);
        if (body.persistHypotheses && client) {
          await persistTestingHypotheses(tenant.id, client.id, dossier);
        }
      } catch {
        send({ phase: "done", dossier: { pipelineId: "full", label: "Pesquisa", sections: [], suggestions: [], skipped: [] } });
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
