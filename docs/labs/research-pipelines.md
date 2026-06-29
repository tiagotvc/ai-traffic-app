# Pipelines de pesquisa + dossiê (fundação)

> Fundação do "resumo" do Orion Brain: agrupa cientistas em **pipelines de pesquisa**, cada uma
> consolidando um **dossiê com seções** (uma por cientista) + **sugestões**. Reutilizável em qualquer
> criação (campanha/persona/zona). 2026-06-29.

## Peças
- **Tipos** — [`types.ts`](../../src/lib/labs/pipelines/types.ts): `ResearchDossier { sections[], suggestions[], confidence, skipped }`,
  `ResearchSection { scientistId, label, icon, summary, confidence, findings[], sources[] }`.
- **Registry** — [`registry.ts`](../../src/lib/labs/pipelines/registry.ts): pipelines nomeadas.
  - `marketing` → competitor (+ trend, consumer quando existirem)
  - `geo` → geo
  - `testing` (Testing Scientist) entra quando a skill existir.
- **Runner** — [`runner.ts`](../../src/lib/labs/pipelines/runner.ts): `runResearchPipeline(id, input)` roda
  os cientistas (em paralelo, respeitando flag/cache via `runScientistSkill`), monta 1 seção por cientista
  que rodou, marca `skipped` os que não, e consolida `suggestions` (findings acionáveis: suggestion/gap/
  avoid/angle/offer/hook) + confiança média.
- **Endpoint** — [`/api/labs/pipeline`](../../src/app/api/labs/pipeline/route.ts): POST `{pipelineId, input}` → dossiê.
- **UI** — [`ResearchDossierCard.tsx`](../../src/components/labs/ResearchDossierCard.tsx): card presentational —
  chips por seção, **Sugestões** sempre visíveis, e "Ver pesquisa completa" (expande seções + findings).

## ✅ Testing Scientist (implementado)
[`testing-skill.ts`](../../src/lib/labs/skills/testing-skill.ts) — flag `scientists.testing`. **Simulação
interna** (não A/B na Meta): consome o dossiê de marketing/geo (via `priorFindings`) + nicho/região e
gera `hypothesis` (hipótese principal) | `test` (o que testar primeiro) | `prediction` (vencedor provável)
| `metric` | `guardrail` (critério de parada), com confiança. **Só IA, zero searchapi.**

**Dossiê completo:** `runResearchWithTesting(input)` ([runner.ts](../../src/lib/labs/pipelines/runner.ts))
roda marketing + geo, alimenta o Testing e devolve tudo num dossiê único. Endpoint: `pipelineId: "full"`.
As sugestões priorizam os achados de teste (hypothesis/test/prediction).

## ✅ Plugado no criador de campanha
[`CampaignCreatorResearchCard`](../../src/components/campaign-creator/CampaignCreatorResearchCard.tsx)
no sidebar ([CampaignCreatorUxSidebar](../../src/uxpilot-ui/adapters/CampaignCreatorUxSidebar.tsx)): manda
só `clientSlug` + objetivo; o endpoint resolve o cliente (`getClientBySlugOrId`) → preenche nicho/país →
roda `pipelineId:"full"` → mostra o dossiê (Concorrentes · Geo · Testes + Sugestões). **Persiste as
hipóteses do Testing em `ClientHypothesis`** (status SUGGESTED, com `dedupeKey` → não duplica).

## ✅ Feedback em tempo real (SSE)
- **Runner com eventos:** `runFullResearch(input, emit)` emite `start` → `scientist_start`/`scientist_done`
  por cientista → `done` (dossiê). Tipos em [types.ts](../../src/lib/labs/pipelines/types.ts) (`PipelineEvent`).
- **Endpoint SSE:** [`/api/labs/pipeline/stream`](../../src/app/api/labs/pipeline/stream/route.ts) — `text/event-stream`,
  persiste hipóteses no fim.
- **Card ao vivo:** o `CampaignCreatorResearchCard` streama e mostra "🧪 Laboratório iniciado" + cada
  cientista entrando ("analisando…" → ✓ N achados / — pulado), com **chime suave (WebAudio)** no início,
  e ao final o dossiê. Feed no [`ResearchDossierCard`](../../src/components/labs/ResearchDossierCard.tsx) (prop `steps`).

## Próximos passos
1. Migrar os cards atuais (persona/zona) para o dossiê unificado.
2. Performance Scientist (fecha o loop pós-campanha → ClientLearning/DNA; move hipóteses p/ CONFIRMED).
3. Pesos de crédito dos cientistas no `ai_credit_weights`.

## Histórico
- 2026-06-29: fundação (tipos + registry + runner + endpoint + card). Aditivo — não altera os cards atuais.
