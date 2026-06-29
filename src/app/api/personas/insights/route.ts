import { NextResponse } from "next/server";
import { In } from "typeorm";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { aiGenerateJson } from "@/lib/ai/generate";
import { getAppContext, getClientBySlugOrId, getMetaAccessTokenForAdAccount } from "@/lib/app-context";
import { extractPersonaTargetingItems } from "@/lib/audience-targeting-shared";
import { assertFeatureEnabled, FeatureDisabledError, isPlatformFeatureEnabled } from "@/lib/feature-flags/service";
import { fetchDeliveryEstimate, validateTargetingIdList } from "@/lib/meta-graph";

const FLAG = "audiences.personaInsights";

/** GET → estado da flag (UI decide se mostra o painel). */
export async function GET() {
  return NextResponse.json({ ok: true, enabled: await isPlatformFeatureEnabled(FLAG) });
}

const BodySchema = z.object({
  clientId: z.string().min(1),
  adAccountId: z.string().min(1),
  targeting: z.record(z.string(), z.unknown()).optional().default({}),
  ageMin: z.number().int().min(13).max(65).optional(),
  ageMax: z.number().int().min(13).max(65).optional(),
  gender: z.enum(["all", "male", "female"]).optional(),
  narrative: z.string().max(2000).optional()
});

const AiSchema = z.object({
  coherenceScore: z.number().min(0).max(100),
  summary: z.string().min(10),
  recommendations: z
    .array(
      z.object({
        title: z.string().min(3),
        body: z.string().min(8),
        severity: z.enum(["high", "medium", "low"])
      })
    )
    .max(6)
});

type DemoRow = { bucket: string; spend: number; conversions: number; cpa: number | null };

function aggregateDemo(
  rows: { breakdownValue: string; spend: string; conversions: string; cpa?: string | null }[]
): DemoRow[] {
  const out: DemoRow[] = rows.map((r) => ({
    bucket: r.breakdownValue,
    spend: Number(r.spend ?? 0),
    conversions: Number(r.conversions ?? 0),
    cpa: r.cpa != null ? Number(r.cpa) : null
  }));
  // melhor performance (menor CPA com conversões) primeiro
  return out.sort((a, b) => {
    if (a.conversions > 0 && b.conversions === 0) return -1;
    if (b.conversions > 0 && a.conversions === 0) return 1;
    return (a.cpa ?? Infinity) - (b.cpa ?? Infinity);
  });
}

export async function POST(req: Request) {
  try {
    await assertFeatureEnabled(FLAG);
  } catch (e) {
    if (e instanceof FeatureDisabledError) {
      return NextResponse.json({ ok: false, error: "persona_insights_disabled" }, { status: 404 });
    }
    throw e;
  }

  const { tenant, user, metaAccessToken } = await getAppContext();
  if (!user) return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });

  const body = BodySchema.parse(await req.json().catch(() => ({})));
  const client = await getClientBySlugOrId(tenant.id, body.clientId);
  if (!client) return NextResponse.json({ ok: false, error: "client_not_found" }, { status: 404 });

  const accessToken =
    (await getMetaAccessTokenForAdAccount(tenant.id, user.id, body.adAccountId)) ?? metaAccessToken;
  if (!accessToken) {
    return NextResponse.json({ ok: false, error: "meta_not_connected" }, { status: 400 });
  }

  const hasTargeting = Object.keys(body.targeting ?? {}).length > 0;

  // 1) Tamanho real (delivery estimate) — só quando há targeting (segmentos).
  const estimate = hasTargeting
    ? await fetchDeliveryEstimate(accessToken, body.adAccountId, body.targeting).catch(() => ({
        estimateReady: false,
        usersLowerBound: null,
        usersUpperBound: null
      }))
    : { estimateReady: false, usersLowerBound: null, usersUpperBound: null };

  // 2) Validade dos segmentos da persona (vazio quando ainda não há targeting).
  const items = extractPersonaTargetingItems(body.targeting ?? {});
  const ids = items.map((i) => i.id);
  const validated = ids.length
    ? await validateTargetingIdList(accessToken, body.adAccountId, ids).catch(() => [])
    : [];
  const invalidIds = new Set(validated.filter((v) => v.valid === false).map((v) => v.id));
  const invalidSegments = items.filter((i) => invalidIds.has(i.id)).map((i) => ({ id: i.id, name: i.name }));

  // 3) Coerência demográfica vs dados reais (breakdowns sincronizados).
  const { audienceInsightBreakdown: breakdownRepo } = await repositories();
  const breakdownRows = await breakdownRepo
    .find({ where: { clientId: client.id, breakdownType: In(["age", "gender"]) } })
    .catch(() => []);
  const ageRows = aggregateDemo(breakdownRows.filter((r) => r.breakdownType === "age"));
  const genderRows = aggregateDemo(breakdownRows.filter((r) => r.breakdownType === "gender"));
  const bestAge = ageRows.find((r) => r.conversions > 0)?.bucket ?? null;

  // 4) Recomendações por IA (router) com explicabilidade.
  let ai: z.infer<typeof AiSchema> | null = null;
  let provider: string | null = null;
  try {
    const prompt = [
      "Você é analista sênior de mídia paga. Avalie a COERÊNCIA de uma persona contra os DADOS REAIS",
      "da conta Meta do cliente. Responda só com JSON.",
      "",
      `Persona — faixa: ${body.ageMin ?? "?"}-${body.ageMax ?? "?"}, gênero: ${body.gender ?? "all"}.`,
      body.narrative ? `Descrição: ${body.narrative.slice(0, 600)}` : "",
      `Segmentos: ${items.length} (inválidos: ${invalidSegments.length}).`,
      `Tamanho estimado: ${estimate.usersLowerBound ?? "?"}–${estimate.usersUpperBound ?? "?"} pessoas.`,
      "",
      "Performance por IDADE (melhor CPA primeiro):",
      ageRows
        .slice(0, 8)
        .map((r) => `- ${r.bucket}: CPA ${r.cpa ?? "—"}, conv ${r.conversions}`)
        .join("\n") || "(sem dados)",
      "Performance por GÊNERO:",
      genderRows
        .map((r) => `- ${r.bucket === "1" ? "masculino" : r.bucket === "2" ? "feminino" : r.bucket}: CPA ${r.cpa ?? "—"}, conv ${r.conversions}`)
        .join("\n") || "(sem dados)",
      "",
      "Tarefa: dê `coherenceScore` (0-100), `summary` (2-3 frases) e `recommendations` (até 4, com",
      "title/body/severity). Aponte se a faixa/gênero/segmentos fazem sentido vs os dados; se um",
      "segmento está inválido, recomende substituir. Use números. Não invente dados."
    ]
      .filter(Boolean)
      .join("\n");

    const res = await aiGenerateJson({
      task: { kind: "analysis", complexity: "medium", label: "persona.insights" },
      prompt,
      schema: AiSchema
    });
    ai = res.data;
    provider = res.meta.provider;
  } catch {
    ai = null;
  }

  // Fallback por regras quando a IA está indisponível (sem chave/erro) — garante
  // que o card sempre mostre algo útil em vez de ficar vazio.
  if (!ai) {
    const recs: z.infer<typeof AiSchema>["recommendations"] = [];
    let scoreVal = 75;
    const ageMinV = body.ageMin ?? 18;
    const ageMaxV = body.ageMax ?? 65;
    if (ageMaxV - ageMinV > 35) {
      scoreVal -= 15;
      recs.push({
        title: "Faixa etária ampla",
        body: `${ageMinV}–${ageMaxV} é largo; teste segmentar por idade para reduzir CPA.`,
        severity: "medium"
      });
    }
    if ((body.gender ?? "all") === "all") {
      recs.push({
        title: "Gênero 'Todos'",
        body: "Valide se há diferença de performance por gênero antes de manter ambos.",
        severity: "low"
      });
    }
    if (invalidSegments.length) {
      scoreVal -= 20;
      recs.push({
        title: "Segmentos inválidos",
        body: `${invalidSegments.length} segmento(s) descontinuado(s) na Meta — substitua.`,
        severity: "high"
      });
    }
    if (!items.length) {
      recs.push({
        title: "Sem segmentos ainda",
        body: "Defina interesses/comportamentos no Criador de Públicos para refinar o alcance.",
        severity: "low"
      });
    }
    if (bestAge) {
      recs.push({
        title: `Melhor idade real: ${bestAge}`,
        body: "Os dados do cliente convertem melhor nessa faixa — considere alinhar a persona.",
        severity: "medium"
      });
    }
    ai = {
      coherenceScore: Math.max(0, Math.min(100, scoreVal)),
      summary:
        "Análise rápida por regras (IA indisponível no momento). Baseada em faixa etária, gênero e segmentos da persona.",
      recommendations: recs.slice(0, 4)
    };
    provider = "rules";
  }

  // Pesquisa de concorrentes/tendências/testes migrou para a pipeline unificada
  // (ResearchPipelineCard, escopo persona) — aqui ficam só os insights da própria persona.

  return NextResponse.json({
    ok: true,
    estimate,
    segments: { total: items.length, invalid: invalidSegments },
    demographics: {
      bestAge,
      personaRange: { min: body.ageMin ?? null, max: body.ageMax ?? null, gender: body.gender ?? "all" },
      age: ageRows.slice(0, 8),
      gender: genderRows
    },
    ai,
    provider
  });
}
