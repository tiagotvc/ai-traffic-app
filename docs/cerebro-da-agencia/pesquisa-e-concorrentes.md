# Pesquisa multi-fonte, comparação com concorrentes e timeline

> Documento técnico do pipeline de geração de aprendizados do Cérebro da agência: **o que
> existe hoje, por que ainda não compara concorrentes de verdade ao gerar o aprendizado, e o
> roadmap** para pesquisa multi-fonte (Meta Ad Library, Google, etc.) + timeline com evidências.
> Complementa o [README do Cérebro](./README.md).
>
> 📌 Para o **plano de produto vs. RedTrack.io** (Meta CAPI, agente/MCP sobre o Brain, atribuição),
> ver [plano-acao-vs-redtrack](./plano-acao-vs-redtrack.md).

## TL;DR

- Os aprendizados que aparecem no feed (ex.: `cpa_efficient`, `ctr_strong`, badge "Regra") são
  **sinais calculados sobre as métricas do PRÓPRIO cliente** (Meta Ads). **Não** há comparação com
  concorrentes na geração desses aprendizados.
- **Existe** integração com a **Meta Ad Library** (scan de concorrentes + extração de padrões +
  síntese de mercado por IA), acionada pelo botão **"Refinar pesquisas"**.
- ✅ **Fase 1 implementada:** a IA que gera os aprendizados agora **recebe** o contexto de
  concorrentes/mercado (padrões da Meta Ad Library) e é instruída a **comparar o cliente com o
  nicho**. (Antes era desconectado.) Falta persistir a evidência no learning e na timeline (Fases 2-3).
- **Google e outras fontes**: **não implementado** (só Meta Ad Library).
- **Timeline**: ✅ **Fase 3 implementada** — o painel busca a **timeline real do cliente** e
  registra/mostra os eventos de **pesquisa de mercado** (`market_scanned`) com **concorrentes,
  padrões e links dos anúncios** comparados. (Antes mostrava só 1 evento sintético.)

## Como os aprendizados são gerados hoje (3 caminhos)

| Caminho | Rota / serviço | Fonte de dados | Compara concorrentes? |
|---|---|---|---|
| **Regras (signals)** | `POST /api/clients/[id]/learnings/suggest` → `learning-suggestion-service.ts` → `campaign-signal-analyzer.ts` + `learning-rules.ts` | Só métricas do cliente (7d vs período anterior / baseline 30d) | ❌ Não |
| **IA** | `POST /api/clients/[id]/learnings/ai-suggest` → `creative-memory/ai-learning-generator.ts` | Só métricas do cliente + DNA + aprendizados aprovados (`get-client-brain-context.ts`) | ❌ Não |
| **Refinar pesquisas** | `RefineResearchBar` → `useRefineResearch.ts` → `/api/agency-brain/market-learnings` | Roda os 2 acima **+** scan da Meta Ad Library em paralelo | 🟡 Faz scan, mas não cruza com o cliente |

### Sinais por regra (o que você vê nos cards)

Definidos em [`campaign-signal-analyzer.ts`](../../src/lib/agency-brain/campaign-signal-analyzer.ts)
e [`learning-rules.ts`](../../src/lib/agency-brain/learning-rules.ts):
`cpa_efficient`, `ctr_strong`, `saturation`, `spend_waste`, `roas_lift`, `budget_concentration`,
`spike_cpa/ctr/roas` — todos **comparando o cliente com ele mesmo** (período anterior / baseline).
Tiers `weak|medium|strong`. Confiança em [`confidence-score.ts`](../../src/lib/agency-brain/confidence-score.ts).

## O que já existe de mercado/concorrentes (mas desconectado)

| Peça | Arquivo | O que faz |
|---|---|---|
| Meta Ad Library | [`meta-ad-library/provider.ts`](../../src/lib/meta-ad-library/provider.ts) | `fetchMetaAdLibrary()` busca anúncios por `client.competitors` (pageIds) e por termos do nicho. **Prioridade:** SearchAPI (`SEARCHAPI_API_KEY`, [`searchapi-provider.ts`](../../src/lib/meta-ad-library/searchapi-provider.ts)); fallback Meta Graph `ads_archive` ([`official-graph-provider.ts`](../../src/lib/meta-ad-library/official-graph-provider.ts)) com `META_AD_LIBRARY_ACCESS_TOKEN`/`META_SYSTEM_USER_TOKEN`. |
| Extração de padrões | [`market-pattern-extractor.ts`](../../src/lib/agency-brain/market-pattern-extractor.ts) | Top hooks/headlines, formatos, CTAs dos anúncios dos concorrentes (com nome do anunciante e link). |
| Memória de mercado | `MarketMemory` entity + [`market-memory-service.ts`](../../src/lib/agency-brain/market-memory-service.ts) | Persiste o scan (TTL ~72h): `patternsJson`, `adsAnalyzed`, `competitorsScanned`. |
| Síntese IA de mercado | [`market-learnings-service.ts`](../../src/lib/agency-brain/market-learnings-service.ts) | IA gera 2-4 **insights gerais do nicho** a partir dos padrões — não comparação direta com o cliente. |
| Painel de mercado | `MarketLearningsPanel` / `useMarketLearnings` | Mostra os insights de mercado — **só na implementação `AgencyBrainContent`** (escopo "Mercado"), não no feed atual. |

**O gap central:** o scan de concorrentes acontece, mas:
1. A IA que gera os **aprendizados do cliente** (`ai-learning-generator.ts`) **não recebe** os
   padrões de mercado — `get-client-brain-context.ts` não inclui `MarketMemory`.
2. Não há **comparação cliente × concorrentes** (ex.: "você usa CTA X em 20%; o nicho usa em 60%";
   "seu hook é único"; "seu CTR está abaixo de anúncios similares").

## Google / outras fontes

**Não implementado.** Há scopes de Google Ads definidos (`google-env.ts`, "fase 2") e menções em
mock/roadmap (GA4, Search Console, TikTok, LinkedIn), mas **nenhuma integração ativa**. Hoje a
única fonte externa real é a **Meta Ad Library**.

## Timeline — por que não mostra as pesquisas/comparações

- No feed, o painel [`LearningTimelinePanel`](../../src/components/agency-brain/insights/LearningTimelinePanel.tsx)
  recebe eventos de `useBrainInsights.getTimelineForLearning()`, que **monta 1 evento sintético**
  ("created") no cliente — **não busca** a timeline real.
- A timeline real ([`timeline-service.ts`](../../src/lib/agency-brain/timeline-service.ts) +
  entity `ClientTimelineEvent`) registra eventos como `learning_suggested`, `learning_approved`,
  `hypothesis_*`, `metric_spike`, `sync_completed` — **mas nenhum** de pesquisa/competidor.
- Os **research logs** ([`research-log-repository.ts`](../../src/lib/agency-brain/insights/research-log-repository.ts))
  **têm** os dados desejados (concorrentes escaneados, nº de anúncios, top hooks/CTAs, amostras de
  anúncios) — mas são **in-memory por sessão**, **não vinculados ao aprendizado**, e **caem em
  mock** (`MOCK_RESEARCH_LOGS`) quando não houve refine. Por isso não foram plugados na timeline
  (exibiriam dados falsos).
- Tipos visuais de evento `market_signal` e `competitor_signal` já existem no painel
  (`timelineTypeConfig`), mas **nunca são emitidos**.

## Roadmap para o objetivo (pesquisa real + comparação + timeline)

### Fase 1 — IA usar contexto de concorrentes ✅ IMPLEMENTADA (2026-06-24)
- [`ai-learning-generator.ts`](../../src/lib/creative-memory/ai-learning-generator.ts) agora carrega
  a `MarketMemory` válida do cliente (`getValidMarketMemory`) e injeta no prompt um bloco
  **"Mercado / concorrentes (Meta Ad Library)"** com nº de anúncios/concorrentes e os padrões
  (hooks/CTAs/formatos). O prompt instrui a IA a **comparar o cliente com o nicho** e gerar ao
  menos 1 aprendizado comparativo (tag `mercado`) quando houver dados.
- Sequência confirmada: [`useRefineResearch.ts`](../../src/components/agency-brain/insights/useRefineResearch.ts)
  já roda **scan → detect → IA → síntese** de forma sequencial, então a IA usa o scan **fresco** da
  mesma rodada de "Refinar pesquisas".
- **Pré-requisitos para funcionar de fato:** `SEARCHAPI_API_KEY` **ou** `META_AD_LIBRARY_ACCESS_TOKEN`/`META_SYSTEM_USER_TOKEN`
  configurado, `GEMINI_API_KEY` configurado, e o cliente ter `competitors` (pageIds) e/ou `niche`
  preenchidos. Sem scan prévio (MarketMemory ausente), a IA roda só com dados do cliente (degrada
  graciosamente) e o prompt sugere rodar "Refinar pesquisas".
- **Ainda não** persiste a evidência dos concorrentes no learning nem na timeline (Fases 2 e 3).

### Fase 2 — Evidência de mercado no aprendizado ✅ IMPLEMENTADA (2026-06-24)
- Em [`ai-learning-generator.ts`](../../src/lib/creative-memory/ai-learning-generator.ts), quando a
  IA gera um aprendizado **com a tag `mercado`** (comparação com concorrentes), o draft recebe
  `evidence.comparedTo = "Mercado (Meta Ad Library): N anúncios de M concorrentes"` — persistido no
  learning. Esses aprendizados aparecem no card com a **tag "mercado"**.
- _Nota:_ a vinculação anúncio-a-anúncio específico (qual ad embasou qual learning) ainda não é
  feita; usamos o snapshot do scan como evidência agregada (`comparedTo`).

### Fase 3 — Timeline com evidências de pesquisa ✅ IMPLEMENTADA (2026-06-24)
- Novos `TimelineEventType` `market_scanned` / `competitor_compared` (em
  [`domain/schemas.ts`](../../src/lib/agency-brain/domain/schemas.ts) e
  [`ClientTimelineEvent.ts`](../../src/db/entities/ClientTimelineEvent.ts) — coluna `text`, **sem
  migration**).
- O scan (`/api/agency-brain/market-learnings` action=scan) grava um evento `market_scanned` via
  `recordTimelineEvent` com `metadata` = concorrentes, nº de anúncios, padrões (hooks/CTAs/formatos)
  e **links de amostra da Ad Library**.
- O painel de timeline ([`LearningTimelinePanel`](../../src/components/agency-brain/insights/LearningTimelinePanel.tsx))
  agora busca a **timeline real do cliente** (`GET /api/clients/[id]/timeline`, mapeada em
  [`BrainFeedPage`](../../src/components/agency-brain/insights/BrainFeedPage.tsx)) em vez do evento
  sintético, e renderiza as **evidências**: chips de concorrentes, lista de padrões e links dos
  anúncios comparados. Fallback para o evento sintético se a timeline estiver vazia.

### Fase 4 — Multi-fonte (Google etc.) — ⏳ PENDENTE (precisa de integração externa)
- **Não implementada**: requer credenciais/integração real (Google Ads API/Trends/Search Console,
  TikTok, LinkedIn). Plano: criar uma interface de "provider de mercado" (hoje só
  `meta-ad-library`) e normalizar cada fonte para `MarketInsightDto`, alimentando a mesma
  `MarketMemory`. Sem chaves/escopos válidos não há como trazer dados reais — fica como próximo passo.

## Design (listagem + timeline)

- **Listagem** ([`LearningFeedCard`](../../src/components/agency-brain/insights/LearningFeedCard.tsx)):
  acento superior colorido por impacto; badge "Sugerido" para `SUGGESTED`; tag "mercado" nos
  aprendizados comparativos; ações reais (Aceitar/Dispensar/Gerar hipótese) — ver
  [README](./README.md#ações-do-feed-de-aprendizados-funcionais).
- **Timeline** ([`LearningTimelinePanel`](../../src/components/agency-brain/insights/LearningTimelinePanel.tsx)):
  drawer lateral padronizado (Esc + clique-fora), busca a timeline real do cliente e exibe, nos
  eventos de pesquisa, **chips de concorrentes, padrões e links dos anúncios** comparados. Rodapé
  simplificado (removido o botão "Gerar hipótese" placeholder).

## Histórico
- 2026-06-24 (Fases 2 e 3 + visual): evidência de mercado no aprendizado (`evidence.comparedTo` +
  tag "mercado"); eventos `market_scanned` na timeline com concorrentes/anúncios/padrões; painel de
  timeline busca a timeline real e renderiza as evidências; polimento visual (acento no card,
  rodapé da timeline). Fase 4 (Google/multi-fonte) segue pendente (integração externa).
- 2026-06-24 (Fase 1): IA de aprendizados passa a receber o contexto de concorrentes/mercado
  (Meta Ad Library via `MarketMemory`) e a comparar o cliente com o nicho.
- 2026-06-24: Documentação criada (diagnóstico do pipeline + roadmap). Ajuste visual no card.
