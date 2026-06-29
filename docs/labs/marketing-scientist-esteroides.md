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

### Fase 1 — ✅ IMPLEMENTADA (memória deferida)
Em [`competitor-skill.ts`](../../src/lib/labs/skills/competitor-skill.ts): **Winner DNA** (rankeia por
`daysRunning`, vencedores ≥60 dias com peso na síntese + finding próprio) + **Saturação** (formato
dominante) + **Síntese por IA** (`aiGenerateJson` sobre os vencedores → hooks/ofertas/ângulos/gaps +
`summary` + `confidence`, com fallback por regras). O card Orion Brain mostra resumo + confiança +
achados. **Memória (`MarketMemory`) deferida** — precisa de tenant/clientId (a skill é por nicho);
fica como próximo passo.

### Fase 1 — detalhe (já temos as peças) 🥇
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
4. **✅ Memória de mercado (cache "dados primeiro")** — IMPLEMENTADO em
   [`market-research-cache.ts`](../../src/lib/labs/market-research-cache.ts). O resultado (anúncios +
   síntese) é cacheado por **nicho+país** (não por usuário) no Redis (fallback in-memory): **1 chamada
   ao searchapi por nicho serve TODOS os usuários** durante o TTL (7 dias, configurável). Entrar no
   criador com nicho já pesquisado = **0 chamadas + 0 custo de IA**. Há um **teto mensal**
   (`SEARCHAPI_MONTHLY_BUDGET`, default 90) que protege o limite do plano free.

### Fase 2 — ✅ MULTI-FONTE IMPLEMENTADO 🥈
5. **Multi-fonte** — [`searchapi-sources.ts`](../../src/lib/labs/searchapi-sources.ts), cada uma atrás de
   sub-flag `scientists.competitor.{google,trends,youtube,maps}` e contando no teto mensal:
   - ✅ **Google SERP** → perguntas reais do público (dores/objeções) + buscas relacionadas.
   - ✅ **Google Trends** → buscas em alta (ângulos emergentes).
   - ✅ **YouTube** → concorrentes em vídeo.
   - ✅ **Google Maps** → players locais + reputação (★/avaliações).
   - ❌ `tiktok`/`google_ads`/`tiktok_ads` **não existem** no REST (só no conector MCP, que não roda no
     servidor).
   Os achados entram no mesmo dossiê cacheado por nicho.
6. **✅ Cache compartilhado entre telas** — [`cached-ad-library.ts`](../../src/lib/labs/cached-ad-library.ts):
   o **criador de campanha** (`creator-brain-insights`) e o cientista usam o mesmo fetch cacheado por
   nicho+país → "1 chamada por nicho" vale em **qualquer tela**, com o teto mensal global.
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
