# Visões (aba "Visões" do sidebar)

> **Rota(s):**
> - [`src/app/[locale]/(app)/dashboard/views/page.tsx`](../../src/app/[locale]/(app)/dashboard/views/page.tsx) — galeria de visões (`/dashboard/views`).
> - [`src/app/[locale]/(app)/dashboard/apps/[appId]/page.tsx`](../../src/app/[locale]/(app)/dashboard/apps/[appId]/page.tsx) — canvas/editor de uma visão (`/dashboard/apps/{appId}`).
>
> Item do sidebar `views` → label `nav.views` ([`src/components/layout/AppSidebar.tsx`](../../src/components/layout/AppSidebar.tsx), linha 90). O item fica ativo tanto em `/dashboard/views` quanto em `/dashboard/apps/*`.
>
> **Fonte de verdade desta feature. Atualize este doc a cada incremento/decremento.**

## Visão geral

"Visões" é o módulo de **dashboards editáveis** do Orion. Diferente da **Destaques** (`/dashboard`, layout curado), aqui o usuário cria várias "visões" (internamente chamadas de *layouts* / *apps*) e monta cada uma com um **canvas de grid** onde adiciona, remove, redimensiona, reposiciona e configura **widgets**.

A feature tem duas telas:

1. **Galeria** (`/dashboard/views`): lista as visões existentes, permite criar nova (em branco, a partir de template, ou vinculada a um cliente) e excluir. Criar/abrir uma visão abre o **editor em nova aba** (`/dashboard/apps/{appId}?edit=1`).
2. **Canvas** (`/dashboard/apps/{appId}`): renderiza a visão. Em modo edição expõe toolbar do builder, paleta de widgets, painel de propriedades, templates, publicação (link compartilhável) e modo TV. Em modo leitura renderiza só os widgets.

Ambas as telas são **gated por plano** (entitlement `allowDashboardCanvas`); sem permissão exibem upsell.

## Arquitetura / fluxo de arquivos

| Camada | Arquivo |
|---|---|
| Rota (galeria, server) | [`src/app/[locale]/(app)/dashboard/views/page.tsx`](../../src/app/[locale]/(app)/dashboard/views/page.tsx) |
| Rota (canvas, server) | [`src/app/[locale]/(app)/dashboard/apps/[appId]/page.tsx`](../../src/app/[locale]/(app)/dashboard/apps/[appId]/page.tsx) |
| Adapter galeria (entry) | [`src/uxpilot-ui/adapters/DashboardViewsPage.tsx`](../../src/uxpilot-ui/adapters/DashboardViewsPage.tsx) |
| Galeria (UI + dados) | [`src/uxpilot-ui/adapters/DashboardAppsHome.tsx`](../../src/uxpilot-ui/adapters/DashboardAppsHome.tsx) |
| Adapter canvas (entry + gate) | [`src/uxpilot-ui/adapters/DashboardAppView.tsx`](../../src/uxpilot-ui/adapters/DashboardAppView.tsx) |
| Canvas (UI + dados) | [`src/uxpilot-ui/adapters/DashboardCanvasLive.tsx`](../../src/uxpilot-ui/adapters/DashboardCanvasLive.tsx) |
| Componente canvas (chrome/toolbar) | [`src/components/dashboard/canvas/DashboardCanvas.tsx`](../../src/components/dashboard/canvas/DashboardCanvas.tsx) |
| Shell do canvas (paleta + grid + painel) | [`src/components/dashboard/canvas/AppCanvasShell.tsx`](../../src/components/dashboard/canvas/AppCanvasShell.tsx) |
| Grid drag/resize | [`src/components/dashboard/canvas/DashboardGrid.tsx`](../../src/components/dashboard/canvas/DashboardGrid.tsx) |
| Render de cada widget | [`src/components/dashboard/canvas/WidgetRenderer.tsx`](../../src/components/dashboard/canvas/WidgetRenderer.tsx) |
| Paleta de widgets | [`src/components/dashboard/canvas/WidgetPalette.tsx`](../../src/components/dashboard/canvas/WidgetPalette.tsx) |
| Painel de propriedades do widget | [`src/components/dashboard/canvas/WidgetPropertyPanel.tsx`](../../src/components/dashboard/canvas/WidgetPropertyPanel.tsx) |
| Galeria de visões (cards) | [`src/components/dashboard/canvas/AppGallery.tsx`](../../src/components/dashboard/canvas/AppGallery.tsx) |
| Upsell (plano sem canvas) | [`src/components/dashboard/canvas/ViewsPlanUpsell.tsx`](../../src/components/dashboard/canvas/ViewsPlanUpsell.tsx) |
| Boot screen (abrir/construir) | [`src/components/dashboard/canvas/ViewBuilderBootScreen.tsx`](../../src/components/dashboard/canvas/ViewBuilderBootScreen.tsx) |
| Hook estado do canvas (CRUD layout/widgets) | [`src/uxpilot-ui/adapters/useDashboardCanvas.ts`](../../src/uxpilot-ui/adapters/useDashboardCanvas.ts) |
| Hook de dados (métricas, séries, brain, etc.) | [`src/uxpilot-ui/adapters/useDashboardData.ts`](../../src/uxpilot-ui/adapters/useDashboardData.ts) |
| Navegação p/ abrir editor | [`src/lib/dashboard/view-editor-navigation.ts`](../../src/lib/dashboard/view-editor-navigation.ts) |
| Serviço (DB) de layouts/widgets | [`src/lib/dashboard/dashboard-canvas-service.ts`](../../src/lib/dashboard/dashboard-canvas-service.ts) |
| Catálogo de widgets / tipos (`LayoutDto`, `WidgetInstanceDto`) | [`src/lib/dashboard/widget-catalog.ts`](../../src/lib/dashboard/widget-catalog.ts) |
| Permissões/gating de canvas e widgets | [`src/lib/dashboard/dashboard-widget-permissions.ts`](../../src/lib/dashboard/dashboard-widget-permissions.ts) |

**Fluxo resumido:** a página server-side lê o entitlement (`getAppContext`) e passa `initialAllowCanvas` ao adapter. O adapter reconfirma via `useEntitlementsCanvas` (fetch `/api/me/entitlements`). Se permitido, a galeria carrega layouts/catalog/templates/clientes; ao criar/abrir uma visão, `openViewEditor` abre `/dashboard/apps/{appId}?edit=1` em nova aba. No canvas, `useDashboardCanvas` carrega o layout ativo (`/api/dashboard/layouts`) e o catálogo (`/api/dashboard/catalog`), e persiste cada mudança de widget via `PUT /api/dashboard/layouts/{id}/widgets`. Os widgets renderizam com dados de `useDashboardData`.

## Elementos da tela / componentes

### `DashboardViewsPage` ([adapter](../../src/uxpilot-ui/adapters/DashboardViewsPage.tsx))
- **Props:** `initialAllowCanvas: boolean`.
- Apenas envolve em `CommandStripBridgeProvider` e renderiza `DashboardAppsHome`.

### `DashboardAppsHome` ([galeria](../../src/uxpilot-ui/adapters/DashboardAppsHome.tsx))
- **Props:** `initialAllowCanvas: boolean`.
- Reconfirma permissão (`useEntitlementsCanvas`). Carrega em paralelo: `/api/dashboard/layouts`, `/api/dashboard/catalog` (para `maxDashboards`), `/api/dashboard/templates`, `/api/clients/cards?period=last30`.
- Estados de tela: upsell (`ViewsPlanUpsell`) se sem canvas; `ConnectAccountCard` se `isEmptyState` (sem dados de conta); placeholder (`AppCanvasPlaceholder variant="gallery"`) se nenhuma visão; senão `AppGallery`.
- **Ações:** `createApp()` (POST sem template), `onCreateApp(name, {templateId, clientId})` (POST com opções) e `deleteApp(id)` (DELETE). Criar mostra `ViewBuilderBootScreen variant="building"` e abre o editor via `openViewEditor`. Respeita limite `atLimit = layouts.length >= maxApps`.

### `AppGallery` ([cards](../../src/components/dashboard/canvas/AppGallery.tsx))
- **Props principais:** `layouts`, `loading`, `maxApps`, `templates`, `clients`, `allowCreate`, `onCreateApp`, `onDeleteApp`.
- Lista as visões como cards e oferece o fluxo de criação (nome, template, cliente).

### `DashboardAppView` ([adapter canvas](../../src/uxpilot-ui/adapters/DashboardAppView.tsx))
- **Props:** `appId: string`, `initialAllowCanvas: boolean`.
- Gate: `useEntitlementsCanvas`. Se permitido renderiza `DashboardCanvasLive`, senão `ViewsPlanUpsell`.

### `DashboardCanvasLive` ([canvas + dados](../../src/uxpilot-ui/adapters/DashboardCanvasLive.tsx))
- **Props:** `appId: string`.
- Orquestra `useDashboardCanvas(appId, { startInEditMode })` e `useDashboardData`. `startInEditMode` vem de `?edit=1`.
- Gerencia: boot screen (`ViewBuilderBootScreen`, `variant` `building`/`opening`), shell imersivo no modo edição (`useAppBuilderImmersive`), entrar em edição (`enterEditMode`, seta `?edit=1`), reset de layout, aplicar template, publicar/despublicar, e criação de widget por IA.
- Auto-entra em edição quando o layout ativo não tem widgets. Redireciona para `/dashboard/views` se o `appId` não existe.
- Carrega `/api/dashboard/templates` e `/api/dashboard/catalog` (limits) e repassa tudo ao `DashboardCanvas`.

### `DashboardCanvas` ([chrome + toolbar](../../src/components/dashboard/canvas/DashboardCanvas.tsx))
- **Props principais:** `activeLayout`, `editMode`/`setEditMode`/`onEnterEditMode`, `catalog`, `limits`, `dashboardData`, callbacks `onLayoutChange`/`onAddWidget`/`onRemoveWidget`/`onWidgetConfigChange`, `onResetLayout`, `onApplyTemplate`, `onUpdateLayoutMeta`, `onPublishLayout`, `templates`, flags `saving`/`resetting`/`applyingTemplate`/`publishingLayout`. (Também suporta `highlightsMode` reaproveitado pela Destaques — fora do escopo desta aba.)
- Renderiza a toolbar (`BuilderCanvasToolbar` no modo edição full-bleed, ou `PageToolbar`+`DashboardToolbarActions`), o `AppCanvasShell` com os widgets, o modal de templates (`DashboardTemplatesModal`) com confirmação, e o **modo TV** (overlay full-screen sem edição). Esconde filtros globais/sync via `useCommandStripPage`.

### `AppCanvasShell` ([shell](../../src/components/dashboard/canvas/AppCanvasShell.tsx))
- **Props principais:** `widgets`, `editMode`, `allowResize`, `dashboardData`, `layoutLoading`, `layoutRevision`, callbacks de layout/widget.
- Em modo edição compõe a paleta (`WidgetPalette`), o grid (`DashboardGrid`), o painel de propriedades do widget selecionado (`WidgetPropertyPanel`) e o modal de inserção de blocos (`BlockInsertModal`). Fornece contextos (`AppCanvasScopeProvider`, `HighlightsCanvasViewProvider`).

### `DashboardGrid` ([grid](../../src/components/dashboard/canvas/DashboardGrid.tsx))
- Grid de 12 colunas com drag & drop e resize (resize gated por `allowResize`). Cada célula renderiza `WidgetRenderer` (envolto por `WidgetChrome` no modo edição). Emite `onLayoutChange` quando a posição/tamanho muda.

### `WidgetRenderer` ([render](../../src/components/dashboard/canvas/WidgetRenderer.tsx))
- **Props:** `instance: WidgetInstanceDto`, `dashboardData`, `onWidgetConfigChange`.
- Mapeia `instance.widgetType` para o componente concreto (KPIs, gráficos, breakdowns, alertas, app blocks, taskbar, widgets de IA, premium, etc.). Aplica `parseSlotVisualConfig`, `parseExtendedChartStyle`, período por widget (`parseWidgetPeriod`) e escopo de dados (`useWidgetScopedDashboardData`).

## Dados, estado e API

### Hooks
- [`useDashboardCanvas(layoutId, { startInEditMode })`](../../src/uxpilot-ui/adapters/useDashboardCanvas.ts): fonte de estado do canvas. Mantém `layouts`, `activeLayout`, `editMode`, `catalog`, `limits`, `isPlatformAdmin`, `saving`. Expõe `addWidget`, `removeWidget`, `updateWidgetConfig` (debounce 450ms), `updateLayoutFromGrid`, `saveWidgets`, `createLayout`, `resetLayoutToDefault`, `applyTemplate`, `updateLayoutMeta`, `reloadLayouts`. Normaliza/migra widgets no load (`normalizeWidgetLayout`, `prepareHighlightsLayoutWidgets`). Bloqueia edição no mobile.
- [`useEntitlementsCanvas(initial)`](../../src/uxpilot-ui/adapters/useDashboardCanvas.ts): revalida `allowDashboardCanvas` via `/api/me/entitlements`.
- [`useDashboardData()`](../../src/uxpilot-ui/adapters/useDashboardData.ts): summary/timeseries/variações/alertas/clientes/brain/ageBreakdown, métricas de gráfico, período (via Command Strip), `isEmptyState`. Alimenta os widgets.

### Endpoints (`src/app/api`)
| Método | Endpoint | Uso |
|---|---|---|
| GET / POST | [`/api/dashboard/layouts`](../../src/app/api/dashboard/layouts/route.ts) | listar visões / criar visão (nome, `templateId`, `clientId`). |
| GET / PATCH / DELETE | [`/api/dashboard/layouts/[id]`](../../src/app/api/dashboard/layouts/[id]/route.ts) | obter / renomear/subtitle/`published`/`isDefault` / excluir. |
| PUT | [`/api/dashboard/layouts/[id]/widgets`](../../src/app/api/dashboard/layouts/[id]/widgets/route.ts) | salvar widgets do layout (substitui todos). |
| POST | [`/api/dashboard/layouts/[id]/reset`](../../src/app/api/dashboard/layouts/[id]/reset/route.ts) | resetar layout para o default. |
| POST | [`/api/dashboard/layouts/[id]/apply-template`](../../src/app/api/dashboard/layouts/[id]/apply-template/route.ts) | aplicar template ao layout. |
| GET | [`/api/dashboard/layouts/[id]/share`](../../src/app/api/dashboard/layouts/[id]/share/route.ts) | dados/token de compartilhamento (visão publicada). |
| GET | [`/api/dashboard/catalog`](../../src/app/api/dashboard/catalog/route.ts) | catálogo de widgets + `limits` (maxDashboards/maxDashboardWidgets/allowResize/allowAiBuilder) + `isPlatformAdmin`. |
| GET | [`/api/dashboard/templates`](../../src/app/api/dashboard/templates/route.ts) | templates de sistema + do tenant. |
| GET | [`/api/dashboard/widgets/[type]/data`](../../src/app/api/dashboard/widgets/[type]/data/route.ts) | dados por widget (escopo cliente/conta/período), incluindo `alerts.card`. |
| POST | [`/api/dashboard/ai-widgets`](../../src/app/api/dashboard/ai-widgets/route.ts) | criação de widget por IA. |
| GET | [`/api/dashboard/summary`](../../src/app/api/dashboard/summary/route.ts), [`/timeseries`](../../src/app/api/dashboard/timeseries/route.ts), [`/age-breakdown`](../../src/app/api/dashboard/age-breakdown/route.ts), [`/brain-summary`](../../src/app/api/dashboard/brain-summary/route.ts), [`/brain-shelf`](../../src/app/api/dashboard/brain-shelf/route.ts) | dados consumidos por `useDashboardData` para os widgets. |
| GET | `/api/clients/cards`, `/api/me/entitlements` | clientes para vincular visão / revalidar gating. |

### Modelos / entities
- `DashboardLayout` ([`src/db/entities/DashboardLayout`](../../src/db/entities/DashboardLayout.ts)) — uma "visão" (campos: `name`, `slug`, `subtitle`, `isDefault`, `clientId`, `published`, `viewToken`, `publishedAt`, `sortOrder`). DTO: `LayoutDto`.
- `DashboardWidgetInstance` ([`src/db/entities/DashboardWidgetInstance`](../../src/db/entities/DashboardWidgetInstance.ts)) — widget posicionado (`widgetType`, `x/y/w/h`, `size`, `visible`, `config`, `sortOrder`). DTO: `WidgetInstanceDto`.
- `DashboardTemplate`, `DashboardWidgetPermission`, `DashboardAddon` — templates, permissões por widget e add-ons (ex.: Master Blaster).
- Tipos centrais em [`src/lib/dashboard/widget-catalog.ts`](../../src/lib/dashboard/widget-catalog.ts) (`WIDGET_CATALOG`, `WIDGET_CATEGORY_ORDER`, `LayoutDto`, `WidgetInstanceDto`).

## Permissões / gating

Tudo é controlado por **entitlements** ([`src/lib/billing`](../../src/lib/billing)):

- `allowDashboardCanvas`: liga/desliga a aba inteira. Server (`getAppContext`) passa `initialAllowCanvas`; o cliente revalida com `useEntitlementsCanvas` ([`useDashboardCanvas.ts`](../../src/uxpilot-ui/adapters/useDashboardCanvas.ts)). Sem ele → `ViewsPlanUpsell`. As APIs reforçam com `assertDashboardCanvas` ([`dashboard-widget-permissions.ts`](../../src/lib/dashboard/dashboard-widget-permissions.ts)), que lança `DashboardCanvasForbiddenError` (HTTP 403).
- `maxDashboards`: número máximo de visões (`-1` = ilimitado). Aplicado na galeria (`atLimit`) e no serviço (`createDashboardLayout` lança `Dashboard limit reached`).
- `maxDashboardWidgets`: teto de widgets por layout (`saveLayoutWidgets` lança `Widget limit reached`).
- `allowDashboardResize`: habilita redimensionar no grid.
- `allowDashboardAiWidgets` (`false`/`basic`/`premium`/`advanced`) e `allowDashboardAiBuilder`: gating dos widgets de IA / builder por IA.
- **Por widget:** `minPlan`, `requiredAddon` (ex.: `MASTER_BLASTER_ADDON`), `isAiWidget`, `comingSoon` — avaliados por `assertDashboardWidget` / `isWidgetAllowedForPlan`. O catálogo marca cada widget como `allowed` para refletir na paleta.
- **Platform admin** ignora todos os gates (`platformAdmin` em `getAppContext`).

Limites por plano definidos em [`src/lib/billing/types.ts`](../../src/lib/billing/types.ts) (ex.: básico `maxDashboards: 3`, `allowDashboardAiWidgets: "basic"`; plano superior `10` / `"premium"`; topo ilimitado `-1` / `"advanced"` + `allowDashboardAiBuilder`).

## Relação com o módulo Visão

A documentação **conceitual/catálogo de componentes editáveis** está em [`../visao/README.md`](../visao/README.md). Aquele doc descreve o *alvo de produto* (cada elemento como componente configurável: card de alerta, KPI, gráficos, breakdown, etc.) e a infra reutilizável (`slot-visual-config`, `widget-config`, `alert-widget-config`).

**Este doc** descreve a **implementação real da aba** (rotas `/dashboard/views` e `/dashboard/apps/[appId]`): galeria, canvas, hooks e APIs. Em resumo: `visao/README.md` = *o que cada widget pode ser*; `visoes/README.md` = *como a aba que monta esses widgets funciona hoje*.

## i18n

- Namespace principal da feature: **`dashboardApps`** ([`messages/pt-BR.json`](../../messages/pt-BR.json), `messages/en.json`) — títulos da galeria, nomes default, textos de upsell (`viewsUpsellTitle`/`viewsUpsellHint`/`viewsUpsellCta`).
- **`dashboardWidgets`** — toolbar do builder, paleta, painel de propriedades, templates e mensagens de salvar/reset.
- **`dashboard`** — estados vazios e textos compartilhados com a Destaques.
- **`nav.views`** — label do item de sidebar.
- **`metrics`** / **`period`** — labels de métricas e período usados pelos widgets via `useDashboardData`.

## Pendências / observações

- Edição é **desktop-only**: `useDashboardCanvas` desliga `editMode` no mobile (`useIsMobile`).
- `useDashboardCanvas` e `DashboardCanvas` compartilham código com a **Destaques** via `highlightsMode`/`HIGHLIGHTS_LAYOUT_EDITOR_V2` ([`highlights-layout-flags.ts`](../../src/lib/dashboard/highlights-layout-flags.ts)); ao mexer no canvas, conferir o impacto na Destaques.
- O editor é aberto em **nova aba** com `?edit=1` (`openViewEditor`); não há navegação interna do app para o editor.
- `saveLayoutWidgets` **substitui todos** os widgets do layout a cada PUT (delete + insert); IDs novos usam prefixo `new-`/`tpl-`/`reset-` e só persistem como UUID se válidos (`isUuid`).
- Persistência de config de widget tem debounce de 450ms; mudanças de grid salvam imediatamente.
- Visões podem ser **publicadas** (geram `viewToken` para link compartilhável) e ter modo **TV** (overlay).
- Os IDs internos misturam três nomes para o mesmo conceito: "view" (UI/sidebar), "app" (rota/`appId`) e "layout" (DB/serviço).

## Histórico de mudanças relevantes

- 2026-06-24: Criação da documentação.
