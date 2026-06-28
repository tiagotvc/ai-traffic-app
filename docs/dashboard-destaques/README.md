# Dashboard — Destaques

Tela inicial do app (`/dashboard`). É uma visão **curada e pouco customizável** (v1):
o usuário liga/desliga e reordena algumas seções, mas não edita os componentes em si.
A edição profunda de cada elemento é objetivo do módulo [Visão](../visao/README.md).

> **Regra de manutenção:** qualquer mudança visual/estrutural nesta tela deve ser
> refletida neste documento na mesma PR.

---

## Arquitetura / fluxo de arquivos

| Camada | Arquivo |
|---|---|
| Rota | [`src/app/[locale]/(app)/dashboard/page.tsx`](../../src/app/[locale]/(app)/dashboard/page.tsx) |
| Adapter de página | `src/uxpilot-ui/adapters/DashboardHighlightsPage.tsx` |
| **Layout fixo (esta tela)** | [`src/uxpilot-ui/adapters/DashboardContentLive.tsx`](../../src/uxpilot-ui/adapters/DashboardContentLive.tsx) |
| Layout canvas (premium, editável) | `src/uxpilot-ui/adapters/DashboardHighlightsCanvasLive.tsx` |
| Dados | `src/uxpilot-ui/adapters/useDashboardData.ts` |
| Mappers (summary → props) | `src/uxpilot-ui/adapters/dashboard-mappers.ts` |
| Preferências de layout | [`src/lib/dashboard-layout-prefs.ts`](../../src/lib/dashboard-layout-prefs.ts) |
| Catálogo de métricas | `src/lib/dashboard-metrics.ts` |

A tela renderiza as seções na ordem definida em `dashboardLayout.sectionOrder`, filtrando
pelas que estão ligadas em `dashboardLayout.sections`. **As seções `alerts` e `agencyHealth`
foram removidas do dash** e são filtradas à força em `DashboardContentLive` (mesmo que
preferências antigas as tenham ligadas).

### ⚠️ Caminho de renderização (importante)

`DashboardHighlightsPage` **sempre renderiza a versão fixa `DashboardContentLive`**. A Destaques
**não é editável na v1**.

> **Por que isso importa:** antes, `DashboardHighlightsPage` escolhia entre a versão fixa e a
> versão **canvas editável** (`DashboardHighlightsCanvasLive`) via `useEntitlementsCanvas`. Como o
> entitlement resolve no cliente, a tela renderizava a versão fixa correta e, em seguida,
> **trocava para o canvas**, que monta o layout a partir de um **layout de widgets persistido no
> servidor** (`canvas.activeLayout.widgets`) cujo seed padrão ainda tinha o layout antigo
> (Alertas, saúde dos clientes, alturas antigas). Resultado: a tela "piscava" o layout novo e
> recarregava o antigo. **Não era memória/cache local** — era o segundo caminho de renderização.
>
> A versão canvas **não foi removida** do código: ela é a base do futuro módulo
> [Visão](../visao/README.md). Quando o Visão for implementado, o seed/catalog de widgets dele
> deve refletir o layout novo.

### Ordem de seções (atual)

`brainShelf` → (`heroKpis` + `secondaryMetrics` + **widgets MVP**) → (`chart` + `ageBreakdown` lado a lado)

---

## Elementos da tela

### 1. Card de alerta — Cérebro da agência (`brainShelf`)

- **Componente:** [`src/components/dashboard/BrainShelf.tsx`](../../src/components/dashboard/BrainShelf.tsx), `variant="notice"`.
- **Tipo:** **card de alerta** — primeiro padrão reutilizável do tipo "alerta" do sistema.
  Esse mesmo padrão será generalizado no módulo [Visão](../visao/README.md#componente-card-de-alerta).

**Comportamento atual no dash:**

- Só aparece **se houver alerta real** do brain (aprendizados e/ou hipóteses pendentes).
  Lógica: `if (isNotice && !isLoading && !hasPending) return null;`.
- **Ícone à esquerda:** fixo (`Sparkles` roxo) — no dash não é editável. No Visão será editável.
- **Badge numérico pulsante:** mostra a quantidade total pendente
  (`learningsCount + hypothesesCount`) com um anel `animate-ping` para sinalizar que é um
  alerta. Some quando a contagem é 0.
- **CTA dependente do tipo de alerta**, ancorado **à direita, no fim do card**: para o alerta
  do brain o texto é "Ver no Cérebro da agência →" (chave i18n `brainViewAll`). Outros tipos
  de alerta (futuros) terão outro texto/destino.
- **Botão fechar (X):** dispensa o card (estado local `noticeDismissed`). No dash a dispensa
  é por sessão; no Visão deve ser **persistida**.

**Props relevantes:** `variant`, `isLoading`, `hypothesesCount`, `learningsCount`,
`suggestionsCount`. (As variantes `feed` e `shelf` do mesmo componente são usadas no canvas/legado.)

**i18n:** `brainNoticeTitle`, `brainNoticeHint`, `brainViewAll`, `brainAlertCount` (aria-label do badge).

---

### 2. KPIs compostos com comparação de período (`heroKpis`)

- **Componente:** [`src/components/dashboard/MetricPrism.tsx`](../../src/components/dashboard/MetricPrism.tsx) (`KpiCardTile`).
- Cards compactos (até 3 por linha) com: ícone, label, valor, badge de tendência (vs. período
  anterior), sub-label e **mini sparkline** (52px).
- **Superfície:** classe `dashboard-kpi-card` — borda inset como `campaign-creator-sidebar-card`,
  **sem** faixa colorida no topo (removido o `borderTop` por métrica).
- Valores em `text-lg` / `--text-main`; cor da métrica só no ícone e no sparkline.
- Quais métricas aparecem: `dashboardLayout.heroMetrics` (até `MAX_HERO_METRICS = 3`); vazio =
  usa os defaults do preset da campanha.

**No dash:** layout denso alinhado ao Campaign Creator DS. No [Visão](../visao/README.md#componente-kpi-card-com-comparação)
serão **totalmente ajustáveis** (tipo de gráfico, cruzamento com outra métrica, cor, fonte,
quais dados aparecem).

---

### 3. Métricas simples sem comparação (`secondaryMetrics`)

- **Componente:** [`src/components/dashboard/canvas/widgets/CanvasMetricStrip.tsx`](../../src/components/dashboard/canvas/widgets/CanvasMetricStrip.tsx)
  (renderizado dentro do `MetricPrism`).
- Chips compactos (`dashboard-metric-chip`): dot, label, valor e badge de tendência.
- **Grid responsivo:** até **8 por linha** no desktop (`lg:grid-cols-8`), fonte `text-xs` / labels `text-[10px]`.
- **Tooltip nativo no valor:** o valor tem `title={item.value}`, então ao passar o mouse sobre
  um valor truncado (com `...`) é possível ver o número completo.

**No dash:** ficam como estão (variação enxuta do KPI Card). No Visão serão uma variação
configurável do card de métrica.

---

### 4. Gráfico de Performance geral (`chart`)

- **Componente:** [`src/components/dashboard/DashboardPerformanceChart.tsx`](../../src/components/dashboard/DashboardPerformanceChart.tsx)
  (`variant="page"`). Renderização avançada em `PremiumChartRenderer.tsx`.
- Gráfico comparativo de várias métricas ao longo do período, com chips para ligar/desligar métricas.
- **Cruzamento limitado a 3 métricas:** já garantido por `MAX_CHART_METRICS = 3`
  (`useDashboardData.toggleChartMetric` ignora a 4ª).
- **Altura compacta:** plot `180–220px` via `DASHBOARD_PAGE_CHART_HEIGHT` (por `chartSize`);
  painel mínimo `CHART_PANEL_MIN_HEIGHT` (compact 220 / default 260 / tall 320).
- Wrapper: `dashboard-card dashboard-card--compact`.

**No dash:** mantém o tipo de gráfico (área). No [Visão](../visao/README.md#componente-gráfico-comparativo)
poderá trocar o tipo de gráfico (`area`/`bar`/`line`/`pie`/`radar`/`composed`/…), cores, legenda, eixos.

> O **gráfico de Alertas** (tabela em camadas, `LiveIntelligenceFeed`) **foi removido do dash**.
> Ele está documentado para o Visão como [menu com listagem](../visao/README.md#componente-listagem-de-alertas).

---

### 5. Faixa etária — gráfico de barras + tabela (`ageBreakdown`)

- **Componente:** [`src/components/dashboard/AgeBreakdownCard.tsx`](../../src/components/dashboard/AgeBreakdownCard.tsx).
- Card `dashboard-card--compact` com **gráfico de barras horizontais** (~140–180px) **+ tabela**
  compacta (`text-[10px]`, headers uppercase).
- **Layout:** agora dividindo a linha **lado a lado com o gráfico de performance** (grid
  `xl:grid-cols-2`) quando ambos estão visíveis — cada um ocupa metade do espaço.
- A tabela aparece logo abaixo do gráfico de barras dentro do mesmo card (altura do card cresce
  para acomodá-la).

**No dash:** como está. No [Visão](../visao/README.md#componente-gráfico--tabela-breakdown) será um
componente "gráfico + tabela" altamente manipulável (tipo de gráfico, estilo da tabela, métricas,
comparações, cruzamentos).

---

### Removidos do dash (mantidos como componentes para o Visão)

| Elemento | Componente | Status |
|---|---|---|
| Alertas (feed/tabela em camadas) | `LiveIntelligenceFeed.tsx` | Removido do dash → Visão (listagem/menu). |
| Saúde dos clientes (4 cards grandes + tabela) | `AgencyHealthLayout.tsx` | Removido do dash → Visão. |
| Cards grandes e simples | — | Removidos do dash. |

Os componentes continuam no código (não foram deletados) para reuso no Visão. No dash, as seções
`alerts` e `agencyHealth` são filtradas em `DashboardContentLive` e **não** aparecem na personalização.

---

### 6. Widgets MVP inspirados em benchmarks (fase 1)

Renderizados **abaixo dos KPIs e chips secundários**, fixos na v1 (fora do modal Personalizar).

- **Componente:** [`src/components/dashboard/DashboardInsightPanels.tsx`](../../src/components/dashboard/DashboardInsightPanels.tsx)
- **Mappers:** `toDashboardMetricSections`, `toDashboardFunnelSteps`, `toDashboardCampaignStatus`, `toDashboardTopCampaigns` em `dashboard-mappers.ts`
- **Dados de campanhas:** `useDashboardData()` → `GET /api/campaigns/list`

| Widget | Descrição |
|--------|-----------|
| **Seções de métricas** | Três cards rotulados CONVERSÃO / FUNIL / FECHAMENTO com 4 células compactas cada (métricas reais + delta vs. período anterior). |
| **Funil virtual** | Impressões → Cliques → Alcance (proxy de page views) → Conversões, com barras proporcionais e taxa entre etapas quando há base. |
| **Status de campanhas** | Contagem por status (ativa / pausada / rascunho / outras) a partir da listagem de campanhas. |
| **Top campanhas** | Top 3 por gasto no período (nome, cliente, gasto, ROAS). |
| **Gráfico de evolução** | Mantido em `DashboardPerformanceChart` — chips ROAS / Gasto / Cliques + correções de domínio do eixo Y. |

Empty states quando não há dados; sem números inventados.

---

### 7. Personalização ("Personalizar") — v1 simples

- **Componente:** [`src/components/dashboard/DashboardCustomizeModal.tsx`](../../src/components/dashboard/DashboardCustomizeModal.tsx).
- Botão "Personalizar" na toolbar (escondido em mobile e no empty state).
- Opções da v1:
  1. **Seções** (ligar/desligar) — apenas as **disponíveis no dash**:
     `brainShelf`, `heroKpis`, `secondaryMetrics`, `chart`, `ageBreakdown`
     (constante `DASHBOARD_AVAILABLE_SECTION_KEYS`). `alerts` e `agencyHealth` **não** aparecem.
  2. **Ordem das seções** (subir/descer) — opera só sobre as seções disponíveis (ignora ocultas).
  3. **Métricas dos KPIs** (até 3).
  4. **Métricas do gráfico** (até 3, via `MetricPickerModal`).
  5. **Tamanho do gráfico** (compact / default / tall).
- "Restaurar" volta ao `DEFAULT_DASHBOARD_LAYOUT`.

> Mantido propositalmente simples na v1. A customização rica é do módulo Visão.

---

## Estado / dados

`useDashboardData()` fornece: `summary`/`prevSummary`, `series`, `chartMetrics` +
`toggleChartMetric`, `dashboardLayout`, contagens do brain (`brainLearningsCount`,
`brainHypothesesCount`), `ageBreakdown`, `locale`, `metricLabel`, `formatMetricValue`, etc.
Empty state: quando não há gasto nem contas conectadas, mostra `ConnectAccountCard` + checklist.

## CSS — classes Destaques (`globals.css`)

| Classe | Uso |
|--------|-----|
| `dashboard-card` | Painéis de gráfico / alerta — borda e fundo creator-style |
| `dashboard-card--compact` | Padding `p-3` |
| `dashboard-kpi-card` | KPI hero com sparkline |
| `dashboard-kpi-card__spark` | Frame inset do mini gráfico |
| `dashboard-metric-chip` | Métricas secundárias em strip |
| `dashboard-panel` | Alias legado (canvas) — mesmo visual compacto |

Ver também [campaign-creator-design-system.md](../campaign-creator-design-system.md) § Card surfaces.

---

## Histórico de mudanças relevantes

- **2026-06-27 (widgets + fixes):** Sidebar Brain restaurado (ícone `Brain`, submenu Aprendizados/Hipóteses/Automações); ícones legados revertidos (só Dashboard usa `Home` + label "Dashboard"); gaps `--app-section-gap` entre seções do dash; sparklines/KPI deltas/gráfico de performance/faixa etária corrigidos; widgets MVP (`DashboardInsightPanels`).
- **2026-06-27:** Redesign compacto alinhado ao Campaign Creator DS: removidas faixas coloridas
  no topo dos KPIs; cards/gráficos menores; até 8 métricas secundárias; gaps `--app-section-gap`;
  novas classes `dashboard-card`, `dashboard-kpi-card`, `dashboard-metric-chip`.
- **2026-06-24 (build):** Correção de erros de tipo que quebravam o `next build` de produção
  (o `next dev` não falha neles): `PageToolbar.tsx` (`canFilter` coagido a `boolean`) e
  `alert-widget-config.ts` (preset `auto` adicionado ao `ALERT_THEME_PRESETS`). Os erros
  "Cannot find module" de `report-pdf-puppeteer.ts` são apenas ausência local dos pacotes
  (declarados no `package.json`); não afetam o build com `install` completo.
- **2026-06-24 (correção):** Destaques agora renderiza **sempre** `DashboardContentLive`.
  A seleção via `useEntitlementsCanvas` (que trocava para o canvas editável e recarregava o
  layout antigo memorizado no servidor) foi removida de `DashboardHighlightsPage`. Ver
  "Caminho de renderização".
- **2026-06-24:** Card de alerta redesenhado (CTA à direita + badge pulsante + fechar);
  sparkline dos KPIs 64→96px; métricas simples até 6/linha + tooltip no valor; gráfico de
  performance com correção do corte inferior (altura 280→320, eixo X ajustado); faixa etária
  lado a lado com performance; alertas e saúde dos clientes removidos do dash; modal de
  personalização atualizado para as seções restantes.
