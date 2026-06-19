import { NextResponse } from "next/server";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import {
  buildMarketResponse,
  getMarketInsights,
  mergeMarketItems,
  synthesizeMarketFromMemory
} from "@/lib/agency-brain/market-learnings-service";
import {
  getValidMarketMemory,
  memoryPatternsToInsights,
  saveSynthesisToMemory,
  scanMarketForClient
} from "@/lib/agency-brain/market-memory-service";
import { billingErrorResponse } from "@/lib/billing/api-errors";
import { resolveCreativeMemoryModelChain } from "@/lib/creative-memory/models";
import {
  assertCreativeMemoryAiAccess,
  getCreativeMemoryAiStatus,
  recordCreativeMemoryAiUsage
} from "@/lib/creative-memory/ai-usage";

export const maxDuration = 60;

async function resolveClient(clientSlug: string | null) {
  if (!clientSlug) {
    return { error: NextResponse.json({ ok: false, error: "Cliente obrigatório" }, { status: 400 }) };
  }

  const { tenant } = await getAppContext();
  const client = await getClientBySlugOrId(tenant.id, clientSlug);
  if (!client) {
    return { error: NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 }) };
  }

  return { tenant, client };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const resolved = await resolveClient(url.searchParams.get("client"));
    if ("error" in resolved && resolved.error) return resolved.error;

    const { tenant, client } = resolved as { tenant: { id: string }; client: NonNullable<Awaited<ReturnType<typeof getClientBySlugOrId>>> };

    const memory = await getValidMarketMemory(tenant.id, client.id);
    const memoryPatterns = memory ? memoryPatternsToInsights(memory, client.niche ?? null) : [];
    const nicheBundle = await getMarketInsights(client.niche);

    return NextResponse.json({
      ok: true,
      ...buildMarketResponse({
        clientName: client.name,
        niche: client.niche ?? null,
        memory,
        memoryPatterns,
        nicheBundle
      })
    });
  } catch (err) {
    console.error("[market-learnings GET]", err);
    return NextResponse.json({ ok: false, error: "Erro ao carregar mercado" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const resolved = await resolveClient(url.searchParams.get("client"));
    if ("error" in resolved && resolved.error) return resolved.error;

    const { tenant, client } = resolved as { tenant: { id: string }; client: NonNullable<Awaited<ReturnType<typeof getClientBySlugOrId>>> };

    let action = url.searchParams.get("action");
    if (!action) {
      const body = await req.json().catch(() => ({}));
      action = typeof body?.action === "string" ? body.action : "scan";
    }

    if (action === "scan") {
      const scan = await scanMarketForClient(tenant.id, client);
      const nicheBundle = await getMarketInsights(client.niche);

      return NextResponse.json({
        ok: true,
        action: "scan",
        apiError: scan.apiError,
        ...buildMarketResponse({
          clientName: client.name,
          niche: client.niche ?? null,
          memory: scan.memory,
          memoryPatterns: scan.patterns,
          nicheBundle
        })
      });
    }

    if (action === "synthesize") {
      if (!client.niche) {
        return NextResponse.json(
          { ok: false, error: "Defina o nicho do cliente para sintetizar" },
          { status: 400 }
        );
      }

      const memory = await getValidMarketMemory(tenant.id, client.id);
      const memoryPatterns = memory ? memoryPatternsToInsights(memory, client.niche ?? null) : [];

      if (memoryPatterns.filter((p) => p.source === "META_AD_LIBRARY").length === 0) {
        return NextResponse.json(
          { ok: false, error: "Escaneie a Biblioteca Meta antes de sintetizar com IA" },
          { status: 400 }
        );
      }

      try {
        await assertCreativeMemoryAiAccess(tenant.id);
      } catch (err) {
        const res = billingErrorResponse(err);
        if (res) return res;
        throw err;
      }

      const aiStatus = await getCreativeMemoryAiStatus(tenant.id);
      const modelChain = resolveCreativeMemoryModelChain(aiStatus.planSlug);

      const generated = await synthesizeMarketFromMemory({
        niche: client.niche,
        clientName: client.name,
        patterns: memoryPatterns,
        modelChain
      });

      if (generated.error) {
        return NextResponse.json({ ok: false, error: generated.error }, { status: 502 });
      }

      if (generated.modelMeta && generated.items.length > 0) {
        await recordCreativeMemoryAiUsage({
          tenantId: tenant.id,
          clientId: client.id,
          kind: "learnings",
          createdCount: generated.items.length,
          modelMeta: generated.modelMeta
        });
        await saveSynthesisToMemory(tenant.id, client.id, generated.items);
      }

      const refreshed = await getValidMarketMemory(tenant.id, client.id);
      const mergedPatterns = refreshed
        ? memoryPatternsToInsights(refreshed, client.niche ?? null)
        : mergeMarketItems(generated.items, memoryPatterns);
      const nicheBundle = await getMarketInsights(client.niche);

      return NextResponse.json({
        ok: true,
        action: "synthesize",
        aiGenerated: generated.items.length,
        ...buildMarketResponse({
          clientName: client.name,
          niche: client.niche ?? null,
          memory: refreshed,
          memoryPatterns: mergedPatterns,
          nicheBundle
        })
      });
    }

    return NextResponse.json({ ok: false, error: "Ação inválida" }, { status: 400 });
  } catch (err) {
    console.error("[market-learnings POST]", err);
    return NextResponse.json({ ok: false, error: "Erro ao processar mercado" }, { status: 500 });
  }
}
