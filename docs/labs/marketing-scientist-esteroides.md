# Marketing Scientist com esteroides — proposta

> Como turbinar o cientista `competitor` (Marketing Scientist). Baseado em `docs/labs/` (fábrica,
> orquestrador, pesquisa recursiva, fontes, memória) e **no que já temos no código**. Proposta — nada
> implementado além do que já existe. 2026-06-28.

## Onde estamos
Hoje ([`competitor-skill.ts`](../../src/lib/labs/skills/competitor-skill.ts)): busca na Meta Ad Library
(searchapi.io) → `extractMarketPatterns` (regras) → findings. É **1 fonte + extração por regras**.

## A tese
O competitor não deve ser uma busca isolada — vira um **pipeline orquestrado** que ganha dimensões:
mais fontes, "por que vence", saturação, gaps, síntese por IA, memória e recursão. Cada esteroide
adiciona uma camada de inteligência **rastreável** (evidência) e com **confiança calculada**.

## Esteroides priorizados (do maior retorno/menor esforço pro mais transformador)

### Fase 1 — já temos as peças 🥇
1. **Síntese por IA (não só regras)** — rodar o **AI router** (`aiGenerateJson`) sobre os anúncios
   coletados → findings estruturados (hooks, ofertas, ângulos), **score de confiança** e um bloco
   **"fazer × evitar"**. Hoje `extractMarketPatterns` é heurístico; a IA eleva a qualidade. _(Temos
   o router; só plugar.)_
2. **Winner DNA (longevidade = prova)** — já temos `daysRunning` em cada `NormalizedAd`. Ranquear
   anúncios **rodando 60–90+ dias** e dar peso maior aos padrões deles ("anúncio velho que não morre
   = vencedor"). Barato, alto valor. (Espelha `agents/winner.md`.)
3. **Saturação + Gap de oportunidade** — sobre os anúncios coletados (sem fonte nova): contar quantos
   usam o mesmo hook/formato → **saturado = risco**; o que **poucos** fazem → **gap = oportunidade**.
   (Espelha `saturation.md` + `opportunity-gap.md`.)
4. **Memória de mercado (cache + composição)** — usar a entidade **`MarketMemory`** (já existe:
   `getValidMarketMemory`/`saveSynthesisToMemory`) pra **cachear por nicho** → reduz custo/latência e
   **fica melhor com o tempo**. (Espelha `06-memory-system.md`/`graph-rag.md`.)

### Fase 2 — mais fontes (a conta searchapi já suporta) 🥈
5. **Multi-fonte: Google Ads + TikTok** — a searchapi.io (mesma conta) tem engines `google_ads`,
   `tiktok_ads`, `linkedin_ads`. Adicionar providers irmãos do `searchapi-provider.ts` → o Marketing
   Scientist cruza **Meta + Google + TikTok** num só dossiê. (Fontes em `agents/sources/`.)
6. **Enriquecer com landing pages** — seguir a URL de destino dos anúncios → extrair **preço,
   garantia, bônus, urgência, prova social** (`sources/landing-pages.md`). Junta "ad" + "oferta".

### Fase 3 — orquestração (o pulo do gato) 🥉
7. **Pesquisa recursiva** — quando um ângulo/entidade recorre (ex.: "dermatologista", "antes/depois"),
   disparar uma **2ª busca direcionada** pra aprofundar (`recursive-research.md`). Profundidade real.
8. **Cientistas companheiros + Debate** — rodar **Consumer** (reviews/social → dores/objeções) e
   **Trend** em paralelo, e um **Debate** (vários agentes votam) pra calcular **confiança** dos achados
   (`consumer.md`, `trend.md`, `debate.md`, `confidence.md`). É o que a `scientist-factory` + `orchestrator`
   desenham.

## Arquitetura (como encaixa no que já fiz)
- A **fábrica de skills** ([`src/lib/labs/skills`](../../src/lib/labs/skills/index.ts)) já é o ponto de
  registro. Cada esteroide vira: ou um **enriquecimento da skill competitor** (Fase 1: IA, winner,
  saturação, memória), ou uma **skill nova** (Fase 2/3: google/tiktok providers, consumer, recursive).
- O **orchestrator** (futuro) roda competitor + consumer + trend em paralelo e consolida — exatamente
  `docs/labs/02-architecture.md`.
- Tudo gated pelas flags `scientists.*` que já criei (liga/desliga cada cientista).

## Recomendação de execução
**Começar pela Fase 1** — é a que mais transforma com o que já temos e sem novas integrações:
1. Síntese por IA + confiança (qualidade), 2. Winner DNA (longevidade), 3. Saturação/Gap, 4. Memória.
Depois Fase 2 (Google/TikTok via searchapi) e Fase 3 (recursão + debate).

## Fontes documentadas (além da Meta Ad Library)
TikTok Creative Center, Google Trends, Landing Pages, Reviews (Amazon/ML/Shopee/Reclame Aqui/Trustpilot),
Social (Reddit/YouTube/TikTok/IG), Client Campaigns, App Stores. Ver `docs/labs/agents/sources/`.

## Histórico
- 2026-06-28: proposta de esteroides (IA+confiança, winner DNA, saturação/gap, memória; depois
  multi-fonte e orquestração/recursão).
