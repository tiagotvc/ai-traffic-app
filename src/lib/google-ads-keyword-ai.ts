import "server-only";

import { z } from "zod";

import { llmGenerateJson } from "@/lib/llm/generate-json";

/**
 * Classificador de INTENÇÃO DE COMPRA de termos de pesquisa do Google Ads via IA
 * (Claude). Complementa o motor determinístico (`google-ads-keyword-eval`, baseado
 * em performance) com uma leitura semântica que funciona em QUALQUER nicho:
 *
 * - `ADD_KEYWORD`  → termo com intenção clara de comprar/contratar o que o anunciante
 *                    oferece (variações geográficas, "residencial", "profissional",
 *                    "preço", "contratar", "perto de mim"…).
 * - `ADD_NEGATIVE` → termo SEM intenção de compra do serviço/produto: faça-você-mesmo
 *                    ("como fazer", "caseiro", "eu mesmo", "receita"), informacional,
 *                    busca por insumos quando se vende serviço ("kit", "máquina"),
 *                    vaga/emprego, gratuito, ou fora do escopo do anunciante.
 * - `IGNORE`       → ambíguo/neutro; não recomenda nada.
 *
 * A decisão é sobre INTENÇÃO, não performance. É a fonte das recomendações que as
 * regras de custo/conversão não conseguem enxergar (ex.: termo DIY que ainda gastou
 * pouco). Resiliente: o chamador deve tratar erro (sem chave/limite) como "sem IA".
 */

export type SearchTermForAi = {
  term: string;
  clicks: number;
  cost: number;
  conversions: number;
};

export type AiTermDecision = {
  term: string;
  decision: "ADD_KEYWORD" | "ADD_NEGATIVE" | "IGNORE";
  matchType: "EXACT" | "PHRASE" | "BROAD";
  confidence: number;
  reason: string;
};

/** Sugestão que o usuário REJEITOU antes — vira exemplo negativo p/ a IA aprender. */
export type RejectedExample = { term: string; decision: "ADD_KEYWORD" | "ADD_NEGATIVE" };

const ClassificationSchema = z.object({
  results: z.array(
    z.object({
      term: z.string(),
      decision: z.enum(["ADD_KEYWORD", "ADD_NEGATIVE", "IGNORE"]),
      matchType: z.enum(["EXACT", "PHRASE", "BROAD"]).catch("PHRASE"),
      confidence: z.number().min(0).max(1).catch(0.6),
      reason: z.string().max(240)
    })
  )
});

/** Quantos termos/keywords enviamos por chamada (limita tokens e custo). */
const MAX_TERMS = 60;
const MAX_KEYWORDS = 80;

const MAX_REJECTED = 40;

function buildPrompt(args: {
  clientName: string;
  niche?: string | null;
  keywords: string[];
  terms: SearchTermForAi[];
  rejected?: RejectedExample[];
}): string {
  const kws = args.keywords.slice(0, MAX_KEYWORDS);
  const termLines = args.terms
    .slice(0, MAX_TERMS)
    .map(
      (t) =>
        `- "${t.term}" (cliques: ${t.clicks}, custo: ${t.cost.toFixed(2)}, conversões: ${t.conversions})`
    )
    .join("\n");

  const rejected = (args.rejected ?? []).slice(0, MAX_REJECTED);
  const rejectedBlock = rejected.length
    ? [
        "",
        "O anunciante já REJEITOU estas sugestões antes — aprenda com o julgamento dele e NÃO sugira estas nem variações muito parecidas (respeite o padrão):",
        rejected
          .map((r) => `- "${r.term}" (havia sido sugerido como ${r.decision === "ADD_KEYWORD" ? "palavra-chave" : "negativa"})`)
          .join("\n")
      ].join("\n")
    : "";

  return [
    "Você é um especialista em Google Ads avaliando TERMOS DE PESQUISA que acionaram os anúncios.",
    "",
    `Anunciante: ${args.clientName}${args.niche ? ` — segmento: ${args.niche}` : ""}.`,
    "As palavras-chave ATIVAS abaixo indicam o que o anunciante VENDE/OFERECE:",
    kws.length ? kws.map((k) => `- ${k}`).join("\n") : "- (sem palavras-chave informadas)",
    "",
    "Para CADA termo de pesquisa, classifique pela INTENÇÃO (não pela performance):",
    "- ADD_KEYWORD: intenção CLARA de comprar/contratar o que o anunciante oferece, alinhada às palavras-chave (inclui variações geográficas, qualificadores como 'residencial', 'profissional', 'preço', 'contratar', 'perto de mim', 'orçamento').",
    "- ADD_NEGATIVE: SEM intenção de compra do serviço/produto do anunciante. Exemplos gerais (adapte ao nicho): faça-você-mesmo ('como fazer', 'caseiro', 'passo a passo', 'eu mesmo', 'receita'); informacional ('o que é', 'significado', 'para que serve'); busca por insumos/equipamentos quando o anunciante vende SERVIÇO ('kit', 'máquina', 'aluguel de máquina', 'produto para'); emprego/vaga ('vaga', 'salário', 'como trabalhar com'); gratuito ('grátis', 'download grátis'); ou claramente fora do escopo do anunciante.",
    "- IGNORE: ambíguo, neutro ou já coberto — não recomenda nada.",
    "",
    "Regras:",
    "- Generalize para qualquer nicho; use as palavras-chave para inferir o que é 'dentro' vs 'fora' de escopo.",
    "- matchType sugerido: PHRASE por padrão; EXACT se for muito específico.",
    "- confidence de 0 a 1 (quão seguro você está da intenção).",
    "- reason: curto, em português, explicando a INTENÇÃO detectada.",
    "- Retorne o campo 'term' EXATAMENTE como recebido.",
    rejectedBlock,
    "",
    "TERMOS DE PESQUISA:",
    termLines,
    "",
    'Responda em JSON: {"results":[{"term","decision","matchType","confidence","reason"}]}'
  ].join("\n");
}

/**
 * Chama a IA e devolve a classificação por termo. Lança em falha (sem chave, limite,
 * schema) — o chamador deve capturar e seguir só com as regras determinísticas.
 */
export async function classifySearchTermIntent(args: {
  clientName: string;
  niche?: string | null;
  keywords: string[];
  terms: SearchTermForAi[];
  rejected?: RejectedExample[];
}): Promise<AiTermDecision[]> {
  if (args.terms.length === 0) return [];

  const { data } = await llmGenerateJson({
    provider: "claude",
    prompt: buildPrompt(args),
    schema: ClassificationSchema
  });

  return data.results;
}
