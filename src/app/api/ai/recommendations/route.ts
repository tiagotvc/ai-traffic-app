import { NextResponse } from "next/server";
import { Between, In } from "typeorm";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";
import {
  geminiGenerateRecommendations,
  type GeminiRecommendations
} from "@/lib/gemini";

function dateNDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  const { tenant } = await getAppContext();
  const { aiRecommendation: recRepo } = await repositories();
  const list = await recRepo.find({
    where: { tenantId: tenant.id, status: "PENDING" },
    order: { createdAt: "DESC" },
    take: 20
  });
  return NextResponse.json({ ok: true, recommendations: list });
}

export async function POST() {
  const { tenant, defaultClient } = await getAppContext();
  const {
    metricSnapshot: metricsRepo,
    adAccount: adAccountRepo,
    aiRecommendation: recRepo
  } = await repositories();

  const start = dateNDaysAgo(30);
  const end = new Date().toISOString().slice(0, 10);

  const accounts = await adAccountRepo.find({ where: { clientId: defaultClient.id } });
  const accountIds = accounts.map((a) => a.id);

  const rows = accountIds.length
    ? await metricsRepo.find({ where: { adAccountId: In(accountIds), day: Between(start, end) } })
    : [];

  const kpis = rows.reduce(
    (acc, r) => {
      acc.spend += Number(r.spend) || 0;
      acc.clicks += Number(r.clicks) || 0;
      acc.impressions += Number(r.impressions) || 0;
      acc.conversions += Number(r.conversions) || 0;
      return acc;
    },
    { spend: 0, clicks: 0, impressions: 0, conversions: 0 }
  );

  const prompt = [
    "Você é um especialista em performance marketing.",
    "Retorne ESTRITAMENTE um JSON válido (sem texto fora do JSON) no formato:",
    '{ "recommendations": [ { "targetId": "string", "actionType": "ALTER_BUDGET|PAUSE_AD|UPDATE_BID", "justification": "string", "value": 10 } ] }',
    "",
    "Contexto do cliente (JSON):",
    JSON.stringify(defaultClient.aiContext ?? {}, null, 2),
    "",
    "KPIs agregados (últimos 30d):",
    JSON.stringify(
      {
        spend: kpis.spend,
        impressions: kpis.impressions,
        clicks: kpis.clicks,
        conversions: kpis.conversions,
        ctr: kpis.impressions ? (kpis.clicks / kpis.impressions) * 100 : 0,
        cpc: kpis.clicks ? kpis.spend / kpis.clicks : 0
      },
      null,
      2
    ),
    "",
    "Regras:",
    "- Sugira até 5 ações técnicas com justificativa curta.",
    "- Se faltar ID real de alvo, use 'mock_target'."
  ].join("\n");

  const apiKey = process.env.GEMINI_API_KEY;
  const fallback: GeminiRecommendations = {
    recommendations: [
      {
        targetId: "mock_target",
        actionType: "ALTER_BUDGET",
        justification:
          "Escalar orçamento gradualmente para explorar melhor performance.",
        value: 10
      }
    ]
  };
  const result = apiKey
    ? await geminiGenerateRecommendations({ apiKey, prompt })
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

