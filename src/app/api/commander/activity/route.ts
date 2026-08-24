import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { repositories } from "@/db/repositories";

/**
 * Log de atividade real do Commander pro tenant — mesmo registro usado pra cobrar
 * crédito de IA (ai_recommendations), só que exposto de forma legível na aba
 * "Histórico" de /commander. targetId="agency_brain" é o mesmo usado por
 * recordCreativeMemoryAiUsage(kind:"chat") no veredito e no chat do Commander.
 *
 * Propositalmente NÃO expõe modelo/provedor (modelUsed/modelRequested) — o usuário
 * vê o que perguntou/foi analisado e a resposta real, nunca qual IA respondeu.
 */
export async function GET() {
  const { tenant } = await getAppContext();
  const { aiRecommendation } = await repositories();

  const rows = await aiRecommendation.find({
    where: { tenantId: tenant.id, targetId: "agency_brain" },
    order: { createdAt: "DESC" },
    take: 20
  });

  return NextResponse.json({
    ok: true,
    activity: rows.map((r) => {
      const payload = r.payload as Record<string, unknown> | null;
      return {
        id: r.id,
        createdAt: r.createdAt,
        kind: (payload?.kind as string | undefined) ?? null,
        question: (payload?.question as string | undefined) ?? null,
        answer: (payload?.answer as string | undefined) ?? null,
        creditsCharged: (payload?.creditsCharged as number | undefined) ?? r.creditsCharged
      };
    })
  });
}
