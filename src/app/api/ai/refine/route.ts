import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";
import {
  geminiGenerateRecommendations,
  type GeminiRecommendations
} from "@/lib/gemini";

const BodySchema = z.object({
  message: z.string().min(1)
});

export async function POST(req: Request) {
  const { tenant, defaultClient } = await getAppContext();
  const body = BodySchema.parse(await req.json().catch(() => ({})));
  const { aiRecommendation: recRepo } = await repositories();

  const apiKey = process.env.GEMINI_API_KEY;
  const fallback: GeminiRecommendations = {
    recommendations: [
      {
        targetId: "mock_target",
        actionType: "PAUSE_AD",
        justification:
          "Exemplo (sem GEMINI_API_KEY): pausa preventiva baseada no comando do usuário.",
        value: 0
      }
    ]
  };
  const result = apiKey
    ? await geminiGenerateRecommendations({
        apiKey,
        prompt: [
          "Você é um especialista em performance marketing.",
          "Retorne ESTRITAMENTE um JSON válido (sem texto fora do JSON) no formato:",
          '{ "recommendations": [ { "targetId": "string", "actionType": "ALTER_BUDGET|PAUSE_AD|UPDATE_BID", "justification": "string", "value": 10 } ] }',
          "",
          "Contexto do cliente (JSON):",
          JSON.stringify(defaultClient.aiContext ?? {}, null, 2),
          "",
          "Instrução do gestor:",
          body.message
        ].join("\n")
      })
    : fallback;

  const saved = await Promise.all(
    result.recommendations.map((r) =>
      recRepo.save(
        recRepo.create({
          tenantId: tenant.id,
          clientId: defaultClient.id,
          targetId: r.targetId,
          actionType: r.actionType,
          payload: r,
          justification: r.justification,
          preview: r.preview ?? null,
          status: "PENDING"
        })
      )
    )
  );

  return NextResponse.json({ ok: true, recommendations: saved });
}
