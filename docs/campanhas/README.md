# Campanhas (aba "Campanhas" do sidebar)

> Rota(s): `/[locale]/(app)/campaigns` e subrotas (`/campaigns/[metaCampaignId]`, `/adsets`, `/ads`, `/creatives`, `/campaigns/columns`, `/campaigns/new`, `/campaigns/new/[draftId]`); relacionadas: `/[locale]/(app)/adsets` e `/[locale]/(app)/ads/new` (redirect).
> Fonte de verdade desta feature. Atualize este doc a cada incremento/decremento.

## Visão geral

A aba "Campanhas" é o centro de gestão das campanhas Meta (Facebook/Instagram) de cada cliente. Ela cobre três frentes:

1. **Listagem / Hub** — tabela de campanhas agrupada por tipo/preset, com filtros, busca, colunas de métricas configuráveis, alternância de status (ativar/pausar) e período. Permite abrir o detalhe (embutido ou em página própria) e retomar/descartar rascunhos.
2. **Detalhe hierárquico** — navegação campanha → conjunto de anúncios (ad set) → anúncio (ad) → criativos, cada nível com KPIs, série temporal, tabela de métricas e ações (pausar/ativar, editar orçamento, ver na Meta).
3. **Criação / Publicação** — um wizard ("campaign creator") em `/campaigns/new` (com rascunho persistido em `/campaigns/new/[draftId]`) que cria campanha, conjuntos e anúncios e publica diretamente na Meta. O mesmo fluxo é reaproveitado em modos parciais (adicionar conjunto, adicionar anúncio) via o "publish panel" acessível de qualquer tela.

Os dados de performance vêm de snapshots sincronizados da Meta (banco) com fallback para chamadas ao vivo/cache; ações de escrita (pausar, orçamento, publicar) vão direto à Graph API da Meta.

## Arquitetura / fluxo de arquivos

| Camada | Arquivo |
| --- | --- |
| Rota — lista | [src/app/[locale]/(app)/campaigns/page.tsx](../../src/app/[locale]/(app)/campaigns/page.tsx) |
| Rota — detalhe (overview) | [src/app/[locale]/(app)/campaigns/[metaCampaignId]/page.tsx](../../src/app/[locale]/(app)/campaigns/[metaCampaignId]/page.tsx) |
| Rota — conjuntos | [src/app/[locale]/(app)/campaigns/[metaCampaignId]/adsets/page.tsx](../../src/app/[locale]/(app)/campaigns/[metaCampaignId]/adsets/page.tsx) |
| Rota — anúncios | [src/app/[locale]/(app)/campaigns/[metaCampaignId]/ads/page.tsx](../../src/app/[locale]/(app)/campaigns/[metaCampaignId]/ads/page.tsx) |
| Rota — criativos | [src/app/[locale]/(app)/campaigns/[metaCampaignId]/creatives/page.tsx](../../src/app/[locale]/(app)/campaigns/[metaCampaignId]/creatives/page.tsx) |
| Rota — config. de colunas | [src/app/[locale]/(app)/campaigns/columns/page.tsx](../../src/app/[locale]/(app)/campaigns/columns/page.tsx) |
| Rota — criar (entry) | [src/app/[locale]/(app)/campaigns/new/page.tsx](../../src/app/[locale]/(app)/campaigns/new/page.tsx) + [layout.tsx](../../src/app/[locale]/(app)/campaigns/new/layout.tsx) |
| Rota — rascunho | [src/app/[locale]/(app)/campaigns/new/[draftId]/page.tsx](../../src/app/[locale]/(app)/campaigns/new/[draftId]/page.tsx) |
| Rota — hub de conjuntos | [src/app/[locale]/(app)/adsets/page.tsx](../../src/app/[locale]/(app)/adsets/page.tsx) |
| Rota — `/ads/new` (redirect → `/campaigns/new`) | [src/app/[locale]/(app)/ads/new/page.tsx](../../src/app/[locale]/(app)/ads/new/page.tsx) |
| Adapter (UX shell) — lista | [src/uxpilot-ui/adapters/CampaignsView.tsx](../../src/uxpilot-ui/adapters/CampaignsView.tsx) |
| Adapter (UX shell) — criar | [src/uxpilot-ui/adapters/NewCampaignView.tsx](../../src/uxpilot-ui/adapters/NewCampaignView.tsx) |
| Componente — hub/lista | [src/components/CampaignsHubClient.tsx](../../src/components/CampaignsHubClient.tsx) |
| Componente — detalhe (overview/adsets embutido) | [src/components/CampaignManagerClient.tsx](../../src/components/CampaignManagerClient.tsx) |
| Componente — conjuntos | [src/components/CampaignAdSetsClient.tsx](../../src/components/CampaignAdSetsClient.tsx) |
| Componente — anúncios | [src/components/CampaignAdsClient.tsx](../../src/components/CampaignAdsClient.tsx) |
| Componente — criativos | [src/components/CampaignCreativesClient.tsx](../../src/components/CampaignCreativesClient.tsx) |
| Componente — hub de conjuntos | [src/components/AdSetsHubClient.tsx](../../src/components/AdSetsHubClient.tsx) |
| Componente — config. de colunas/tipos | [src/components/CampaignTableColumnsPage.tsx](../../src/components/CampaignTableColumnsPage.tsx) |
| Wizard — orquestrador | [src/components/campaign-creator/CampaignCreatorClient.tsx](../../src/components/campaign-creator/CampaignCreatorClient.tsx) |
| Wizard — contexto/rascunho | [src/components/campaign-creator/CampaignDraftContext.tsx](../../src/components/campaign-creator/CampaignDraftContext.tsx) |
| Wizard — passos | [src/components/campaign-creator/steps/](../../src/components/campaign-creator/steps/) (`ObjectiveStep`, `CampaignStep`, `AdSetStep`, `AdStep`, `ReviewStep`) |
| Publish panel (overlay global) | [src/components/publish/](../../src/components/publish/) (`PublishPanelContext`, `PublishPanelHost`, `PublishCampaignSidebar`) |
| Gating de plano (nav) | [src/lib/billing/nav-permissions.ts](../../src/lib/billing/nav-permissions.ts) |
| Entity — rascunho/template | [src/db/entities/CampaignTemplate.ts](../../src/db/entities/CampaignTemplate.ts) |
| Entity — snapshot de métricas | [src/db/entities/CampaignMetricSnapshot.ts](../../src/db/entities/CampaignMetricSnapshot.ts) |
| Entity — tipos/presets de colunas | [src/db/entities/CampaignTypeDefinition.ts](../../src/db/entities/CampaignTypeDefinition.ts), [CampaignPreset.ts](../../src/db/entities/CampaignPreset.ts), [CustomMetric.ts](../../src/db/entities/CustomMetric.ts) |
| Lib — publicação na Meta | [src/lib/meta-campaign.ts](../../src/lib/meta-campaign.ts), [src/lib/meta-graph.ts](../../src/lib/meta-graph.ts) |
| Lib — rascunho (schema/validação/score) | [src/lib/campaign-draft.ts](../../src/lib/campaign-draft.ts) |
| Lib — detalhe (query/hints) | [src/lib/campaign-detail-query.ts](../../src/lib/campaign-detail-query.ts), [campaign-detail-api.ts](../../src/lib/campaign-detail-api.ts) |

## Telas e subrotas

Hierarquia: **Campanha → Conjunto de anúncios → Anúncio → Criativos**. As subrotas de detalhe propagam o cliente via `?client=<slug>` e o período via query (`?period=last7`, `since`/`until`).

- `/campaigns` → Hub/lista de campanhas ([CampaignsHubClient](../../src/components/CampaignsHubClient.tsx)): tabela agrupada por preset/tipo, busca + filtros Meta ([MetaFilterSearchBar](../../src/components/campaign/MetaFilterSearchBar.tsx)), colunas de métricas configuráveis, status inline, filtro de período e cards mobile. Lista também rascunhos para retomar/descartar. Em modo não-UX-chrome, abre o detalhe embutido (`CampaignManagerClient`) num painel inferior.
- `/campaigns/[metaCampaignId]` → Detalhe / **overview** ([CampaignManagerClient](../../src/components/CampaignManagerClient.tsx) com `tab="overview"`): cabeçalho (nome, status, cliente, conta, objetivo, orçamento diário), `PeriodFilter`, botão de sincronizar, menu de ações (pausar/ativar/duplicar), 4 cards de KPI com sparkline, gráfico de performance multi-métrica, card de status com ações rápidas (pausar, editar orçamento, duplicar, ver na Meta) e barra lateral com os conjuntos.
- `/campaigns/[metaCampaignId]/adsets` → **Conjuntos** ([CampaignAdSetsClient](../../src/components/CampaignAdSetsClient.tsx)): tabela de ad sets com toggle de status, colunas por preset, ordenação, paginação, totais e cards de insight (melhor ROAS, maior gasto, pausados) + gráfico de distribuição. (O `CampaignManagerClient` também renderiza uma versão da tabela de conjuntos na aba `adsets`.)
- `/campaigns/[metaCampaignId]/ads` → **Anúncios** ([CampaignAdsClient](../../src/components/CampaignAdsClient.tsx)): tabela de anúncios com miniatura de criativo, coluna opcional de conjunto, filtro por ad set (`?adset=`), preview inline de criativo, ordenação e paginação.
- `/campaigns/[metaCampaignId]/creatives` → **Criativos** ([CampaignCreativesClient](../../src/components/CampaignCreativesClient.tsx)): galeria de criativos com métricas por card.
- `/campaigns/columns` → Configuração de tipos de campanha / colunas ([CampaignTableColumnsPage](../../src/components/CampaignTableColumnsPage.tsx)): criar/editar/excluir tipos (presets de métricas), escolher métricas, definir métricas customizadas (fórmulas) e marcar como compartilhado.
- `/campaigns/new` → **Criação** ([NewCampaignView](../../src/uxpilot-ui/adapters/NewCampaignView.tsx) → [CampaignCreatorClient](../../src/components/campaign-creator/CampaignCreatorClient.tsx)): wizard manual ou geração por IA ([AiCampaignGeneratorClient](../../src/components/campaign-creator/AiCampaignGeneratorClient.tsx)).
- `/campaigns/new/[draftId]` → Mesmo wizard carregando um rascunho persistido; `?review=1` abre direto no passo de revisão (usado após geração por IA).
- `/adsets` → Hub de conjuntos ([AdSetsHubClient](../../src/components/AdSetsHubClient.tsx)): split-view com lista de campanhas à esquerda e conjuntos da campanha selecionada à direita.
- `/ads/new` → Redireciona para `/campaigns/new` (preservando `?client=`).

**Fluxo de criação/publicação (wizard):** Objetivo → Campanha → Conjunto → Anúncio → Revisão. O rascunho é salvo automaticamente (debounce ~1s) na entidade `CampaignTemplate`. Na publicação, o wizard chama um dos endpoints da Meta conforme o modo:
- Campanha completa: `POST /api/meta/campaigns` → cria campanha + conjuntos + anúncios e redireciona para `/campaigns/{campaignId}`.
- Adicionar conjunto: `POST /api/campaigns/{id}/adsets`.
- Adicionar anúncio: `POST /api/adsets/{id}/ads`.

## Elementos / componentes principais

- **[CampaignsHubClient](../../src/components/CampaignsHubClient.tsx)** — props: `{ useUxChrome?: boolean }`. Lista/agrupa campanhas por preset; busca + filtros Meta, colunas reordenáveis (dnd-kit), status inline, período, indicador de origem das métricas (db/live/cache), retomar/descartar rascunhos, detalhe embutido ao clicar numa linha.
- **[CampaignManagerClient](../../src/components/CampaignManagerClient.tsx)** — props: `{ metaCampaignId, clientSlug, tab: "overview" | "adsets", embedded?, periodQuery?, seedRow? }`. Carrega detalhe + conjuntos + contagens (anúncios/criativos) + série temporal em paralelo; KPIs com sparkline e delta vs. período anterior; gráfico multi-métrica; ações de pausar/ativar (campanha e conjunto), editar orçamento ([BudgetEditDrawer](../../src/components/campaign/BudgetEditDrawer.tsx)) e duplicar (abre o publish panel). Reage ao evento `traffic-sync-done` recarregando dados.
- **[CampaignAdSetsClient](../../src/components/CampaignAdSetsClient.tsx)** / **[CampaignAdsClient](../../src/components/CampaignAdsClient.tsx)** / **[CampaignCreativesClient](../../src/components/CampaignCreativesClient.tsx)** — props comuns: `{ metaCampaignId, clientSlug, embedded? }` (Ads também: `initialAdsetId?`). Páginas de cada nível da hierarquia, com tabela/galeria de métricas, ordenação, paginação e [CampaignDetailTabs](../../src/components/campaign/CampaignDetailTabs.tsx) (Overview/AdSets/Ads/Creatives/Events).
- **[CampaignCreatorClient](../../src/components/campaign-creator/CampaignCreatorClient.tsx)** — props: `{ initialDraftId?, initialClientSlug?, initialAddAd?, initialAddAdset?, initialActiveNode?, variant? }`. Orquestra o wizard; envolve o provider de rascunho; monta header/tree/step-panel/preview/footer; dispara a publicação.
- **[CampaignDraftContext](../../src/components/campaign-creator/CampaignDraftContext.tsx)** — `useCampaignDraft()` expõe `payload`, `draftId`, `activeNode`, `updatePayload()` (auto-save com debounce), `flushSave()`, `saving/saveError/lastSavedAt`. Guarda o `CampaignDraftPayload` (objetivo, buyingType, campanha, `adsets[]`, `ads[]`, batch de conjuntos, nós visitados, meta de publicação).
- **Passos do wizard** (`steps/`): `ObjectiveStep` (objetivo + tipo de compra), `CampaignStep` (nome, conta/cliente, orçamento CBO/ABO, categorias especiais, A/B), `AdSetStep` (segmentação, evento de conversão, pixel, agendamento, posicionamentos), `AdStep` (criativo, títulos/textos manuais ou IA, destino, CTA, UTM, identidade), `ReviewStep` (resumo + matriz anúncio×conjunto + regeneração por IA).
- **Publish panel** ([PublishPanelContext](../../src/components/publish/PublishPanelContext.tsx) / [PublishPanelHost](../../src/components/publish/PublishPanelHost.tsx) / [PublishCampaignSidebar](../../src/components/publish/PublishCampaignSidebar.tsx)) — `openPanel({ clientSlug?, fromCampaign?, metaCampaignId?, adset?, mode? })`, onde `mode ∈ { "full", "add-adset", "add-ad" }`. Permite iniciar criação/duplicação a partir de qualquer tela; aciona via querystring `publish=1`.
- **[CampaignStatusToggle](../../src/components/campaign/CampaignStatusToggle.tsx)** / **[CampaignDetailTabs](../../src/components/campaign/CampaignDetailTabs.tsx)** / **[CampaignMobileCards](../../src/components/campaigns/CampaignMobileCards.tsx)** — toggle de status, navegação por abas e layout mobile da lista.

## Dados, estado e API

**Hooks** (em `src/hooks`): [useCampaignPeriod](../../src/hooks/useCampaignPeriod.ts) (período via URL), [useCampaignTableLayout](../../src/hooks/useCampaignTableLayout.ts) (colunas/layout da tabela), [useCampaignTypes](../../src/hooks/useCampaignTypes.ts) (tipos/presets de métricas).

**Endpoints de leitura** (lista/detalhe):
- [GET /api/campaigns](../../src/app/api/campaigns/route.ts) — agrega snapshots por campanha (spend, conversões, leads, CPL, CPA, ROAS, alertas).
- [GET /api/campaigns/list](../../src/app/api/campaigns/list/route.ts) — listagem do hub.
- [GET /api/campaigns/[metaCampaignId]](../../src/app/api/campaigns/[metaCampaignId]/route.ts) — detalhe (via `getCampaignDetail`, com banco + fallback Meta).
- [GET .../adsets](../../src/app/api/campaigns/[metaCampaignId]/adsets/route.ts), [.../ads](../../src/app/api/campaigns/[metaCampaignId]/ads/route.ts), [.../creatives](../../src/app/api/campaigns/[metaCampaignId]/creatives/route.ts), [.../timeseries](../../src/app/api/campaigns/[metaCampaignId]/timeseries/route.ts).
- [GET /api/campaigns/creator-sources](../../src/app/api/campaigns/creator-sources/route.ts), [.../creator-snapshot](../../src/app/api/campaigns/[metaCampaignId]/creator-snapshot/route.ts) — origens/snapshot para clonar/herdar config no wizard.

**Endpoints de escrita** (ações → Graph API):
- [POST /api/campaigns/[metaCampaignId]/actions](../../src/app/api/campaigns/[metaCampaignId]/actions/route.ts) — `pause` | `activate` | `update_budget` (delega a `pauseCampaign`/`activateCampaign`/`updateCampaignDailyBudget` em [meta-graph.ts](../../src/lib/meta-graph.ts)).
- [POST /api/adsets/[metaAdsetId]/actions](../../src/app/api/adsets/[metaAdsetId]/actions/route.ts), [POST /api/ads/[metaAdId]/actions](../../src/app/api/ads/[metaAdId]/actions/route.ts) — pausar/ativar nos níveis inferiores.
- [POST /api/meta/campaigns](../../src/app/api/meta/campaigns/route.ts) — publica campanha completa a partir do rascunho (`createCampaignFromDraft` em [meta-campaign.ts](../../src/lib/meta-campaign.ts)).
- [POST /api/campaigns/[metaCampaignId]/adsets](../../src/app/api/campaigns/[metaCampaignId]/adsets/route.ts) — adiciona conjunto + anúncio a campanha existente.
- [POST /api/adsets/[metaAdsetId]/ads](../../src/app/api/adsets/[metaAdsetId]/ads/route.ts) — adiciona anúncio a conjunto existente.

**Apoio Meta** (segmentação/criativos no wizard): rotas em [src/app/api/meta/](../../src/app/api/meta/) (audiences, saved-audiences, targeting-search, account-options, lead-forms, assets, inventory, discover, etc.).

**Entities / modelos:**
- [CampaignTemplate](../../src/db/entities/CampaignTemplate.ts) — rascunho do wizard (`payload` jsonb, `clientId`, `tenantId`, `name`).
- [CampaignMetricSnapshot](../../src/db/entities/CampaignMetricSnapshot.ts) — métricas diárias por campanha (fonte da lista/KPIs).
- [CampaignTypeDefinition](../../src/db/entities/CampaignTypeDefinition.ts), [CampaignPreset](../../src/db/entities/CampaignPreset.ts), [CustomMetric](../../src/db/entities/CustomMetric.ts) — presets/colunas e métricas customizadas.

**Sincronização com a Meta:** leitura prioriza snapshots no banco (sincronizados por jobs de sync), com fallback ao vivo/cache via token Meta resolvido em [campaign-detail-api.ts](../../src/lib/campaign-detail-api.ts). O botão "Atualizar" dispara `POST /api/sync/run` e, ao concluir, emite o evento de janela `traffic-sync-done`, que faz o detalhe recarregar. Escritas (pausar/ativar/orçamento/publicar) vão direto à Graph API; após publicar, o wizard aciona `/api/meta/discover` para atualizar o cache.

## Permissões / gating

A campanha é gated por plano via [src/lib/billing/nav-permissions.ts](../../src/lib/billing/nav-permissions.ts): o item de nav `campaigns` mapeia para a flag `allowNavCampaigns` (`NAV_LIMIT_KEY.campaigns`), verificada por `isNavItemAllowed(navId, limits)`. Atualmente **todos os planos** (Free, Basic, Advanced, Agency, Master) têm `allowNavCampaigns: true` em [src/lib/billing/types.ts](../../src/lib/billing/types.ts), com default `true` em [resolve-limits.ts](../../src/lib/billing/resolve-limits.ts).

O sidebar ([src/components/layout/AppSidebar.tsx](../../src/components/layout/AppSidebar.tsx)) marca o item com `gate: "campaigns"` e, quando bloqueado, renderiza `NavUpgradeLink` em vez do link normal; páginas usam `PlanNavGate` ([src/components/billing/PlanNavGate.tsx](../../src/components/billing/PlanNavGate.tsx)) para exibir CTA de upgrade. Não há limite numérico de campanhas, mas a capacidade prática é limitada por `maxClients` / `maxAdAccounts` / `maxMembers` (definidos por plano em `types.ts`).

## i18n

Namespaces (em [messages/pt-BR.json](../../messages/pt-BR.json) e [messages/en.json](../../messages/en.json)):
- `campaignsPage` — lista/hub.
- `campaignManager` — detalhe/overview.
- `adsetsPage` — tabela de conjuntos.
- `campaignCreator` — wizard de criação/publicação.
- Auxiliares: `metrics`, `period`, `sync`.

## Pendências / observações

- Aba **Events** do detalhe está desabilitada (placeholder "comingSoon"/`CampaignDetailTabs`).
- A tabela de conjuntos existe em dois lugares (`CampaignManagerClient` aba `adsets` e `CampaignAdSetsClient`) — atenção a divergências ao evoluir.
- `/ads/new` é apenas um redirect para `/campaigns/new` (compatibilidade de link).
- Leitura mistura banco e Meta ao vivo; o indicador de origem (db/live/cache) no hub ajuda a diagnosticar dados desatualizados — depende de sync ativo.
- Todos os planos liberam a aba hoje; se o produto quiser tornar "Campanhas" um recurso pago, basta ajustar `allowNavCampaigns` por plano em `types.ts`.

## Histórico de mudanças relevantes

- 2026-06-24: Criação da documentação.
