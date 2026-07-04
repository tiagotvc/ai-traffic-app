# Orion Research — add-on de pesquisa (visão + fundação)

> Decisão de produto registrada em 2026-07-04: o Orion tem **dois produtos**.
> **Orion Cortex** (core, todo plano): recomendações, aprendizados, hipóteses, backtest,
> templates, automações, execuções, benchmark — margem alta, roda sobre dados que já
> temos (Meta sync + BigQuery + cientistas próprios).
> **Orion Research** (add-on por créditos): pesquisa e monitoramento de fontes externas
> — a infra cara (LLM, APIs, scraping) cobrada de quem usa.
> Fundação técnica já entregue (ver §4); o produto completo (jobs, créditos, UI) é a
> próxima frente.

## 1. Modelo comercial (esboço a validar)

- Plano base: 0 créditos de pesquisa (Cortex completo).
- Add-ons: Research 1 (~50 pesquisas/mês), Research 2 (~250/mês), Unlimited (uso justo).
- 1 crédito ≈ 1 execução de fonte com síntese. O custo estimado do job aparece ANTES de
  criar (estilo AWS): `fontes selecionadas × execuções/mês = créditos/mês`.
- Infra de créditos: reusar a camada de créditos de IA existente (`ai-credits`) com um
  `kind` novo — não inventar um segundo sistema de créditos.

## 2. Roadmap de fontes (plugáveis)

| Fase | Fontes | Estado |
|---|---|---|
| 1 | Meta Ad Library, Google SERP, Google Trends, YouTube, Google Maps | ✅ implementadas (skills atuais); Notícias 🔜 |
| 2 | TikTok Creative Center, Reddit | criativos/tendências |
| 3 | Shopify, Amazon, Mercado Livre | e-commerce ("produto em alta") |
| 4 | LinkedIn, Blogs/Newsletters | B2B |

O pitch não é "temos Google Trends" (todo mundo tem) — é **"o Research combina N fontes
e sintetiza oportunidades automaticamente"**. O valor está na síntese.

## 3. Research Jobs (o produto)

```
Nome: Monitorar mercado de energia solar
Frequência: semanal (cron)
Fontes: ✓ Ad Library ✓ Trends ✓ Notícias ✓ YouTube
Custo estimado: 4 créditos/execução → 16 créditos/mês
```

- Job roda via Inngest (mesmo padrão do labs experiment), consome créditos, grava
  `research_findings` e publica um relatório consolidado.
- **Integração matadora (Research ↔ Hypothesis):** quando o Cortex detecta um problema
  ("CTR caiu 35%"), botão **"Investigar causa"** cria um Research Job one-shot; o
  resultado vira `ClientHypothesis` com evidência das fontes ("Concorrentes migraram
  para UGC em vídeo curto — confiança 78%"). Fecha o ciclo: detectar → pesquisar →
  hipótese → experimento → aprendizado → automatizar.

## 4. Fundação técnica JÁ entregue (2026-07-04)

| Peça | Onde | O que garante |
|---|---|---|
| **`research_findings`** (migration 0068) | [`ResearchFinding`](../../src/db/entities/ResearchFinding.ts) | Artefato genérico: `source, category, entity, summary, confidence, evidence, researchJobId`. O Cortex consome *achados*, nunca fontes — fonte nova não muda nada em quem lê |
| **Registro de fontes** | [`researcher.ts`](../../src/lib/commander/researcher.ts) → `RESEARCH_SOURCES` | Catálogo com fase, `creditCost` e disponibilidade — base do estimador de custo do job |
| **`recordResearchFindings()`** | idem | Persistência best-effort padronizada para qualquer fonte |
| Fontes fase 1 | skills + `researcher.ts` (SearchAPI, Ad Library, reach) | Já operacionais via Scientists |

## 5. O que falta para lançar o add-on (ordem sugerida)

1. **Créditos**: `kind: "research"` na camada de créditos + limites por add-on no billing
   (`TenantAddon` já existe para add-ons — padrão Master Blaster).
2. **`research_jobs`** (entity + cron/Inngest): nome, frequência, fontes[], escopo
   (nicho/cliente/concorrentes), custo estimado, última execução.
3. **Runner**: executa cada fonte selecionada → `research_findings` → síntese única por
   IA → relatório + hipóteses sugeridas.
4. **UI**: página Research (criar job estilo "AWS calculator", lista de jobs, relatório).
5. **Botão "Investigar causa"** nos alertas/recomendações do Cortex (job one-shot).
6. Export `research_findings` → BigQuery (mais uma tabela no bq-export).

## 6. Orion Memory (a tese de longo prazo)

Com Research + Cortex + Laboratory gravando tudo em artefatos e no BigQuery, a memória
vira o ativo: *"para e-commerces de moda com ticket parecido, UGC com prova social
superou institucional nos últimos 60 dias"* — nenhum modelo genérico sabe disso.
Camadas: **BigQuery** = memória bruta · **Learnings** = memória interpretada ·
**Cortex** = decisão sobre a memória · **Research** = sinais externos alimentando.
Agregação cross-tenant sempre anonimizada e por opt-in (padrão já existente no
benchmark por nicho).

## Histórico

- 2026-07-04: Doc criado. Decisão Cortex (core) × Research (add-on por créditos);
  fundação entregue: `research_findings` + `RESEARCH_SOURCES` + `recordResearchFindings`.
