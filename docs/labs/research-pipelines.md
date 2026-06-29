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

## ✅ Card reutilizável + escopos + migração de todos os criadores
- **`ResearchPipelineCard`** ([component](../../src/components/labs/ResearchPipelineCard.tsx)): streaming + feed
  ao vivo + chime, reusado por todos os criadores variando `scope`.
- **Escopos** (`runFullResearch(input, emit, scope)`): `campaign` (marketing+geo), `persona` (marketing),
  `zone` (geo) — todos + Testing. Endpoint SSE aceita `scope`.
- **Reach (zona)**: [`geo-reach.ts`](../../src/lib/labs/geo-reach.ts) calcula o alcance e o stream emite
  evento `reach` → mostrado no dossiê.
- **Criadores migrados:**
  - Campanha → `CampaignCreatorResearchCard` (scope campaign).
  - Zona → `ZoneCreatorBrainTips` usa o card (scope zone, com reach). Substituiu o fetch antigo de geo.
  - Persona → `PersonaCreatorBrainTips` usa o card (scope persona, via `clientSlug` no contexto). O bloco
    de concorrentes saiu do endpoint `personas/insights` (que ficou só com a comparação persona-específica:
    coerência/estimativa/segmentos).

## ✅ Performance Scientist (v1 — readout)
[`performance-scientist.ts`](../../src/lib/labs/performance-scientist.ts) + flag `scientists.performance` +
endpoint [`/api/labs/performance`](../../src/app/api/labs/performance/route.ts). Lê a performance REAL
(`loadClientSignals`, que já roda no sync) e gera um **readout executivo por IA**: itens com `action`
∈ scale | pause | swap_creative | adjust_audience | keep, cada um com justificativa (números do sinal) +
confiança. **Read-only** — não altera learnings/hipóteses (o `runAgencyBrainPipeline` no sync e a
confirmação manual (`confirmHypothesis`) seguem donos disso, por design).

> Importante: o loop sinais→learnings/hipóteses/ações **já roda automático no sync**
> (`runAgencyBrainPipeline` em `sync-meta`/`sync-queue`). O Performance Scientist **não duplica** isso —
> ele é a camada de síntese executiva por cima, e ainda **falta uma UI** para exibi-lo.

### ✅ Surfacing na UI
[`PerformanceReadoutCard`](../../src/components/agency-brain/PerformanceReadoutCard.tsx) no topo do Agency
Brain (escopo cliente, em [AgencyBrainContent](../../src/components/agency-brain/AgencyBrainContent.tsx)):
busca `/api/labs/performance` e mostra os itens de ação (Escalar/Pausar/Trocar criativo/Ajustar
público/Manter) com badge colorida + confiança. Some quando a flag está off ou não há sinais. Read-only.

## Próximos passos
1. (Opcional, com aprovação) vincular hipóteses abertas à evidência de performance (sem auto-confirmar).
2. Pesos de crédito dos cientistas no `ai_credit_weights`.
3. Aposentar o endpoint `zones/insights` (não mais usado pela UI).

## Histórico
- 2026-06-29: fundação (tipos + registry + runner + endpoint + card). Aditivo — não altera os cards atuais.
