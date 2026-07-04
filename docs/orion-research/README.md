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
| 1 | Meta Ad Library, Google SERP, Google Trends, YouTube, Google Maps, **Google News**, **Mercado Livre** | ✅ 7 fontes operacionais via adapter unificado |
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

## Estratégia de integração (decisão 2026-07-04)

**SearchAPI como agregador inicial** — já é o provedor das nossas fontes Google/YouTube
(com orçamento mensal e cache compartilhado), e o catálogo dele cobre TikTok Ads
Library, LinkedIn Ad Library, Amazon, Reddit e mais. Camada de encapsulamento:
[`research-sources.ts`](../../src/lib/commander/research-sources.ts) — cada fonte é um
`ResearchSourceAdapter` (mesma interface, devolve `ResearchFindingDraft[]`), e
`runResearchSource()` é o bloco de construção dos Research Jobs: roda a fonte,
respeita orçamento e persiste em `research_findings`. Trocar SearchAPI por API oficial
em qualquer fonte não muda nada acima desta camada.
V1 = SearchAPI para validar · V2 = APIs oficiais nas fontes críticas (Reddit API,
Mercado Livre ✅ já oficial, Product Hunt GraphQL) · V3 = mistura + crawlers próprios.
Engines do SearchAPI ainda não verificados (TikTok/LinkedIn/Reddit ads) entram como
adapters novos após confirmar slug/response — 30 min cada.

## Warehouse BigQuery (implementado 2026-07-04)

Datasets (nomes por env, defaults abaixo — criados/idempotentes no primeiro uso, tabelas
já existentes no console são reaproveitadas; inserts usam `ignoreUnknownValues`):

| Dataset | Tabela | Alimentada por |
|---|---|---|
| `orion_raw` | `meta_campaign_insights` | Export horário dos snapshots da Meta (watermark) |
| `orion_research` | `external_findings` | **Cache-first**: `runResearchSource` consulta (tenant, client, source, query, `expires_at > now`) ANTES de qualquer fonte; miss → fonte roda → salva com TTL 72h → retorna. SearchAPI nunca é chamado pela UI |
| `orion_cortex` | `recommendations` | Hook em `createActionSuggestion` (toda recomendação) |
| `orion_cortex` | `recommendation_events` | Hooks created/executed/acknowledged/rejected no ciclo de sugestão |
| `orion_cortex` | `learnings` | Export horário (watermark) |
| `orion_intelligence` | `global_learnings` | Agregação anônima no cron (opt-in, ≥2 clientes, 90d) |
| `orion_analytics` | `domain_events`, `executions` | Export horário (telemetria operacional) |

Env: `ENABLE_BIGQUERY_ANALYTICS`, `BIGQUERY_CREDENTIALS_JSON`, `BIGQUERY_PROJECT_ID`,
`BIGQUERY_LOCATION` + `BIGQUERY_DATASET_RAW|CORTEX|RESEARCH|INTELLIGENCE` (defaults
`orion_raw`/`orion_cortex`/`orion_research`/`orion_intelligence`).

Jobs: **primeira sync do tenant** dispara `meta/first-sync.completed` (Inngest) →
backfill 90d + deep analysis (brain-pipeline) em background; **cron diário 6h**
(`/api/cron/daily-sync`) mantém snapshots atualizados (gated por `allowAutoSync`);
**cron horário** (`bq-export`) empurra deltas + benchmarks + global_learnings.
Postgres segue a fonte de verdade transacional; warehouse é sempre best-effort.

## Histórico

- 2026-07-04 (b): **Warehouse implementado** — 5 datasets, DAOs (`bq-warehouse.ts`),
  cache-first de pesquisa (`research-cache.ts` + wire no `runResearchSource`), export
  retargetado (raw/cortex), hooks de recommendations/events, global_learnings,
  job de análise inicial pós-conexão Meta e cron daily-sync.
- 2026-07-04: Doc criado. Decisão Cortex (core) × Research (add-on por créditos);
  fundação entregue: `research_findings` + `RESEARCH_SOURCES` + `recordResearchFindings`.
