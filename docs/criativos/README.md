# Classificação de criativos (aba "Criativos" do sidebar)

> Rota(s): [`src/app/[locale]/(app)/creatives/page.tsx`](../../src/app/[locale]/(app)/creatives/page.tsx) (rótulo i18n `nav.creatives` = "Classificação de criativos").
> Relacionada (legada): [`src/app/[locale]/(app)/creative-memory/page.tsx`](../../src/app/[locale]/(app)/creative-memory/page.tsx) — hoje é apenas um redirect para `/agency-brain/learnings`.
> Fonte de verdade desta feature. Atualize este doc a cada incremento/decremento.

## Visão geral

A aba "Criativos" entrega um **ranking de criativos por tipo de campanha (preset)**. Para cada cliente/conta Meta e período selecionados, o sistema agrega os anúncios por criativo, calcula métricas (ROAS, CTR, CPA, CPM, etc.) e ordena os criativos segundo o **critério de ranqueamento** configurado por tipo de campanha (ex.: Vendas → ROAS maior é melhor; Lead WhatsApp → custo por mensagem menor é melhor). Cada criativo recebe um *score* derivado da posição no ranking e pode ser inspecionado (preview do anúncio, copy, onde é usado) ou comparado entre campanhas/conjuntos.

Os critérios e o piso mínimo de impressões são editáveis num modal ("Critérios de ranqueamento") e persistidos por tenant.

**Diferença entre "creatives" e "creative-memory":**
- **`creatives`** (esta feature) = *Classificação/Ranking de criativos* baseado em performance ao vivo da Meta. É o que o item de sidebar `nav.creatives` aponta.
- **`creative-memory`** = rota **legada**. Hoje [`creative-memory/page.tsx`](../../src/app/[locale]/(app)/creative-memory/page.tsx) apenas redireciona (preservando query string) para `/agency-brain/learnings` (o "Cérebro da agência" / aprendizados de IA). Os componentes em [`src/components/creative-memory/`](../../src/components/creative-memory/) (ex.: [`CreativeMemoryClient.tsx`](../../src/components/creative-memory/CreativeMemoryClient.tsx)) renderizam aprendizados/sugestões do Agency Brain, não o ranking. São features distintas: ranking de performance ≠ memória/IA de criativos.

## Arquitetura / fluxo de arquivos

| Camada | Arquivo |
| --- | --- |
| Página (rota) | [`src/app/[locale]/(app)/creatives/page.tsx`](../../src/app/[locale]/(app)/creatives/page.tsx) |
| Página legada (redirect) | [`src/app/[locale]/(app)/creative-memory/page.tsx`](../../src/app/[locale]/(app)/creative-memory/page.tsx) |
| Adapter raiz | [`src/uxpilot-ui/adapters/CreativesView.tsx`](../../src/uxpilot-ui/adapters/CreativesView.tsx) → [`CreativesContentLive.tsx`](../../src/uxpilot-ui/adapters/CreativesContentLive.tsx) |
| Hook de dados | [`src/uxpilot-ui/adapters/useCreativesData.ts`](../../src/uxpilot-ui/adapters/useCreativesData.ts) |
| Mappers (API → cards de UI) | [`src/uxpilot-ui/adapters/creatives-mappers.ts`](../../src/uxpilot-ui/adapters/creatives-mappers.ts) |
| UI principal (grid + modais mock) | [`src/uxpilot-ui/pages/content/Creatives.tsx`](../../src/uxpilot-ui/pages/content/Creatives.tsx) |
| Card de ranking | [`src/components/creatives/CreativeRankingCard.tsx`](../../src/components/creatives/CreativeRankingCard.tsx) |
| Modal de preview do anúncio | [`src/components/creatives/CreativePreviewModal.tsx`](../../src/components/creatives/CreativePreviewModal.tsx) |
| Modal de comparação | [`src/components/creatives/CreativeCompareModal.tsx`](../../src/components/creatives/CreativeCompareModal.tsx) |
| Modal de critérios | [`src/components/creatives/RankingConfigModal.tsx`](../../src/components/creatives/RankingConfigModal.tsx) |
| Views alternativas/reuso | [`CreativesRankingView.tsx`](../../src/components/creatives/CreativesRankingView.tsx), [`CreativesByCampaignView.tsx`](../../src/components/creatives/CreativesByCampaignView.tsx), [`CreativesLibraryView.tsx`](../../src/components/creatives/CreativesLibraryView.tsx), [`CreativeCardGrid.tsx`](../../src/components/creatives/CreativeCardGrid.tsx) |
| Banner de aviso de acesso | [`src/components/creatives/CreativesAccessWarningBanner.tsx`](../../src/components/creatives/CreativesAccessWarningBanner.tsx) |
| Lógica de ranqueamento | [`src/lib/creative-ranking.ts`](../../src/lib/creative-ranking.ts), [`src/lib/ranking-config.ts`](../../src/lib/ranking-config.ts) |
| Carga de performance (server) | [`src/lib/report-creatives-performance.ts`](../../src/lib/report-creatives-performance.ts), [`src/lib/creatives-ranking-merge.ts`](../../src/lib/creatives-ranking-merge.ts) |
| Acesso/cache à Meta | [`src/lib/creatives-access.ts`](../../src/lib/creatives-access.ts), [`src/lib/creatives-cache.ts`](../../src/lib/creatives-cache.ts), [`src/lib/creatives-access-types.ts`](../../src/lib/creatives-access-types.ts) |
| Gating de navegação | [`src/lib/billing/nav-permissions.ts`](../../src/lib/billing/nav-permissions.ts), [`src/lib/billing/types.ts`](../../src/lib/billing/types.ts) |

Fluxo: a página renderiza `CreativesView` → `CreativesContentLive`, que usa `useCreativesData` (lê cliente/conta/período do `CommandStrip`) para chamar `/api/creatives/performance`. Os grupos retornados são achatados em cards por `creatives-mappers.ts` e exibidos via `Creatives.tsx`/`CreativeRankingCard`. Ações abrem `CreativePreviewModal`, `CreativeCompareModal` e `RankingConfigModal`.

## Telas

- **`/creatives`** → Ranking de criativos. Toolbar com título/subtítulo (`creativesPerf.rankingTitle/Subtitle`), busca, filtro por tipo de campanha (preset) e botão "Critérios de ranqueamento". Abaixo, grid de cards de criativos ordenados por score, agrupados/filtrados por preset. Cliente, conta e período vêm do `CommandStrip` global. Sem cliente selecionado, mostra estado vazio. Mostra banner de proveniência de dados (live/cache) e avisos de acesso por conta.
- **`/creative-memory`** → **redireciona** para `/agency-brain/learnings` (rota legada; não exibe ranking). Ver feature "Cérebro da agência".

## Elementos / componentes principais

- **`CreativesContentLive`** ([arquivo](../../src/uxpilot-ui/adapters/CreativesContentLive.tsx)): orquestra a tela ao vivo. Sem props; consome `useCreativesData()`. Monta `PageToolbar` (eyebrow/título/subtítulo, busca, `FilterSelectDropdown` de presets, botão de critérios), achata grupos em cards (`flattenRankingGroups`), e controla os estados `previewing`/`comparing`/`configOpen`. Esconde filtros/sync globais via `useCommandStripPage`.
- **`Creatives` (UI page)** ([arquivo](../../src/uxpilot-ui/pages/content/Creatives.tsx)): componente de apresentação. Prop principal `live: CreativesLiveProps` (`creatives`, `filterTabs`, `loading`, `searchQuery`, `activeFilterTab`, `onOpenCriteria`, `onPreview`, `onCompare`, `hideChrome`). Em modo `live` usa dados reais; sem `live` renderiza dados mock (storyboard). Filtra por tab de preset + busca por título; renderiza grid de `CreativeRankingCard`.
- **`CreativeRankingCard`** ([arquivo](../../src/components/creatives/CreativeRankingCard.tsx)): card individual — thumbnail, badge de rank/tipo/status, score com barra, grid de métricas (com primária destacada) e ações Ver detalhes/Comparar. Props: `rank`, `title`, `type`, `campaignType`, `campaignsUsed`, `status`, `imageUrl/thumbnailUrl`, `score`, `metrics`, `primaryMetric`, `metricKeys`, `variant`, `onPreview`, `onCompare`.
- **`CreativePreviewModal`** ([arquivo](../../src/components/creatives/CreativePreviewModal.tsx)): modal com abas Anúncio (preview real via iframe por formato/placement), Copy (textos/títulos/descrições/CTAs, clique copia) e Onde é usado (campanhas + placements). Props: `adId`, `adIds`, `imageUrl`, `name`, `rank`, `type`, `campaignType`, `status`, `metrics`, `campaignsUsed`, `onClose`. Busca dados em `/api/creatives/detail`.
- **`CreativeCardGrid`** ([arquivo](../../src/components/creatives/CreativeCardGrid.tsx)): grid reutilizável de cards (usado por `CreativesRankingView`/`CreativesByCampaignView` e em relatórios). Inclui modal de comparação por campanha/conjunto. Props: `creatives`, `metrics`, `primaryMetric`, `campaignType`, `clientSlug`, `showRank`, `loading`, `embedInReport`.
- **`RankingConfigModal`** ([arquivo](../../src/components/creatives/RankingConfigModal.tsx)): edita `minImpressions` e, por preset (`RANKABLE_PRESETS`), a métrica (`RANKABLE_METRICS`) e a direção (asc/desc). Props: `onClose`, `onSaved`. Carrega/salva via `/api/creatives/ranking-config`.
- **`CreativesAccessWarningBanner`** ([arquivo](../../src/components/creatives/CreativesAccessWarningBanner.tsx)): exibe avisos por conta sem acesso/token expirado/rate-limit, com ação sugerida (reconectar Meta etc.). Props: `warnings`, `partialData`.

## Dados, estado e API

**Hook:** [`useCreativesData`](../../src/uxpilot-ui/adapters/useCreativesData.ts) — lê `clientFilter`/`accountFilter`/`period` do `CommandStripContext`, carrega lista de clientes e contas de anúncio, monta `periodQuery` e busca o ranking. Reage ao evento `traffic-sync-done` para recarregar e expõe `refresh`/`onConfigSaved` (forçam `refresh=1`). Retorna `groups`, `warnings`, `loading`, `configOpen`, etc.

**Endpoints (`src/app/api`):**
- [`GET /api/creatives/performance`](../../src/app/api/creatives/performance/route.ts) — ranking principal: retorna `groups` (best/promising/noSpend por preset), `warnings`, `partialData`, `dataSource`, `dataProvenance`. `maxDuration = 60`. Suporta `clientId`, `adAccountId`, período, `refresh=1`, `cacheOnly=1`, `debug=1`.
- [`GET /api/creatives/library`](../../src/app/api/creatives/library/route.ts) — biblioteca/lista de criativos agregados com `performance` (very_high…low) por eficiência dentro do preset.
- [`GET /api/creatives/by-campaign`](../../src/app/api/creatives/by-campaign/route.ts) — criativos agrupados por campanha.
- [`GET /api/creatives/detail`](../../src/app/api/creatives/detail/route.ts) — preview do anúncio, copy, placements e campanhas (usado pelo modal). `maxDuration = 45`.
- [`GET /api/creatives/preview`](../../src/app/api/creatives/preview/route.ts) — preview de anúncio.
- [`GET /api/creatives/download`](../../src/app/api/creatives/download/route.ts) — download de mídia do criativo.
- [`GET|PUT /api/creatives/ranking-config`](../../src/app/api/creatives/ranking-config/route.ts) — lê/salva `RankConfig` por tenant; PUT persiste via `saveRankConfig`.
- Auxiliares de contexto: `/api/clients?minimal=1` e `/api/meta/ad-accounts`.

**Modelos/tipos:**
- `RankConfig`, `RankSpec`, `RANKABLE_PRESETS`, `RANKABLE_METRICS`, `DEFAULT_RANK_CONFIG`, `bestEligible`, `compareByRank`, `meetsMinActivity` em [`src/lib/creative-ranking.ts`](../../src/lib/creative-ranking.ts).
- `CreativeItem`, `CreativeBreakdown`, `CreativeAdsetBreakdown` em [`CreativeCardGrid.tsx`](../../src/components/creatives/CreativeCardGrid.tsx); `UxCreativeCard` em [`creatives-mappers.ts`](../../src/uxpilot-ui/adapters/creatives-mappers.ts); `CreativeRow` em [`CreativesLibraryView.tsx`](../../src/components/creatives/CreativesLibraryView.tsx).
- `CreativeAccessWarning` / códigos de acesso em [`src/lib/creatives-access-types.ts`](../../src/lib/creatives-access-types.ts).
- `MetricKey`/`METRIC_BY_KEY` em [`src/lib/dashboard-metrics.ts`](../../src/lib/dashboard-metrics.ts); presets em [`src/lib/campaign-presets.ts`](../../src/lib/campaign-presets.ts).

## Permissões / gating

A aba é **gated por plano**. O nav id `creatives` mapeia para o limite booleano `allowNavCreatives` em [`src/lib/billing/nav-permissions.ts`](../../src/lib/billing/nav-permissions.ts) (`NAV_LIMIT_KEY.creatives = "allowNavCreatives"`, href `/creatives`). A flag é declarada em [`src/lib/billing/types.ts`](../../src/lib/billing/types.ts) (`allowNavCreatives: boolean`), validada em [`plan-limits-schema.ts`](../../src/lib/billing/plan-limits-schema.ts), resolvida com default `true` em [`resolve-limits.ts`](../../src/lib/billing/resolve-limits.ts) e propagada por addons/entitlements ([`tenant-addons.ts`](../../src/lib/billing/tenant-addons.ts), [`entitlements.ts`](../../src/lib/billing/entitlements.ts)). `isNavItemAllowed("creatives", limits)` decide a visibilidade no sidebar. Quando o plano não inclui, a mensagem `nav.creatives` (em `creativesPerf`/`nav` de bloqueio) informa "Ranking de criativos não está incluído no seu plano atual." Limite de impressões mínimas (não-billing) é controle de ranqueamento, não de plano.

## i18n

Namespaces (em [`messages/pt-BR.json`](../../messages/pt-BR.json) e [`messages/en.json`](../../messages/en.json)):
- **`creativesPerf`** — namespace principal da tela de ranking (títulos, abas, critérios, copy, avisos de acesso, comparação).
- **`creativesPage`** / **`creatives`** — labels da biblioteca/lista (stats, colunas, status, detalhes).
- **`campaignPresets`** — rótulos dos tipos de campanha (presets).
- **`metrics`** — rótulos das métricas.
- **`nav.creatives`** = "Classificação de criativos" (rótulo do item de sidebar).
- **`creativeMemory`** — namespace da rota legada (Agency Brain), separado desta feature.

## Pendências / observações

- `creative-memory` é legado e só redireciona; se for descontinuado de vez, remover a rota e os componentes em `src/components/creative-memory/` (hoje servem ao Agency Brain).
- `Creatives.tsx` ainda carrega um conjunto grande de dados/modais **mock** (modo não-`live`) usados como storyboard; o caminho de produção é sempre `live`.
- O `score` exibido é derivado da posição no ranking (`scoreForRank`), não uma métrica calculada da Meta.
- Em `CreativesLibraryView` o indicador "↑ 18%" no card de total é placeholder estático.

## Histórico de mudanças relevantes

- 2026-06-24: Criação da documentação.
