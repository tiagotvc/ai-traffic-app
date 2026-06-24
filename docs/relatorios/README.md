# Relatórios (aba "Relatórios" do sidebar)

> Rota(s): [`/[locale]/reports`](../../src/app/[locale]/(app)/reports/page.tsx) (página da app) e [`/[locale]/report-print`](../../src/app/[locale]/(preview)/report-print/page.tsx) (view de impressão usada pelo Puppeteer e pelo "Abrir view de impressão").
> Fonte de verdade desta feature. Atualize este doc a cada incremento/decremento.

## Visão geral

A feature **Relatórios** permite ao usuário gerar um relatório de performance de um cliente Meta (Facebook/Instagram), comparando o período atual com o período imediatamente anterior de mesma duração. O fluxo típico:

1. O usuário seleciona **cliente**, **conta de anúncios** (opcional), **período** e **tipo de relatório** (Simples ou Completo), além das **métricas** que aparecerão nos KPIs.
2. Clica em "Pré-visualizar" — a UI busca os dados em [`/api/reports/preview`](../../src/app/api/reports/preview/route.ts) e renderiza o relatório dentro da própria página via [`ReportPreview`](../../src/components/reports/ReportPreview.tsx).
3. Pode abrir a **view de impressão** (`/report-print`) em nova aba para imprimir via navegador (Ctrl+P) ou gerar o **PDF** server-side (Puppeteer renderiza a mesma view de impressão).
4. Pode criar **agendamentos** (report schedules) que enviam o PDF/resumo por e-mail periodicamente via cron.

O relatório **Completo** adiciona análise por IA (Claude), recomendações e narrativa executiva; o **Simples** traz apenas a narrativa heurística. A feature é **gated por plano** (`allowNavReports`), e o número de agendamentos é limitado por `maxScheduledReports`.

## Arquitetura / fluxo de arquivos

| Camada | Arquivo |
| --- | --- |
| Página (rota) | [`src/app/[locale]/(app)/reports/page.tsx`](../../src/app/[locale]/(app)/reports/page.tsx) |
| Gate de navegação (layout) | [`src/app/[locale]/(app)/reports/layout.tsx`](../../src/app/[locale]/(app)/reports/layout.tsx) |
| Adapter de UI | [`src/uxpilot-ui/adapters/ReportsView.tsx`](../../src/uxpilot-ui/adapters/ReportsView.tsx) |
| Componente cliente principal | [`src/components/ReportsClient.tsx`](../../src/components/ReportsClient.tsx) |
| Render do relatório (preview + print) | [`src/components/reports/ReportPreview.tsx`](../../src/components/reports/ReportPreview.tsx) |
| Subcomponentes de tela | [`src/components/reports/`](../../src/components/reports/) (KPI grid, picker de métricas, breakdown de público, highlight card, etc.) |
| View de impressão (rota) | [`src/app/[locale]/(preview)/report-print/page.tsx`](../../src/app/[locale]/(preview)/report-print/page.tsx) |
| API preview (JSON) | [`src/app/api/reports/preview/route.ts`](../../src/app/api/reports/preview/route.ts) |
| API PDF / e-mail | [`src/app/api/reports/pdf/route.ts`](../../src/app/api/reports/pdf/route.ts) |
| API resumo WhatsApp | [`src/app/api/reports/whatsapp/route.ts`](../../src/app/api/reports/whatsapp/route.ts) |
| API agendamentos (listar/criar) | [`src/app/api/report-schedules/route.ts`](../../src/app/api/report-schedules/route.ts) |
| API agendamentos (editar/excluir) | [`src/app/api/report-schedules/[scheduleId]/route.ts`](../../src/app/api/report-schedules/[scheduleId]/route.ts) |
| Cron de agendamentos | [`src/app/api/cron/report-schedules/route.ts`](../../src/app/api/cron/report-schedules/route.ts) |
| Montagem de dados do preview | [`src/lib/report-preview-data.ts`](../../src/lib/report-preview-data.ts) |
| Tipos do payload | [`src/lib/report-preview-types.ts`](../../src/lib/report-preview-types.ts) |
| Bundle de dados da view de impressão | [`src/lib/report-print-data.ts`](../../src/lib/report-print-data.ts) |
| Geração de PDF (Puppeteer) | [`src/lib/report-pdf-puppeteer.ts`](../../src/lib/report-pdf-puppeteer.ts) |
| Geração de PDF (fallback pdf-lib) + WhatsApp | [`src/lib/report-generate.ts`](../../src/lib/report-generate.ts) |
| Token assinado da view de impressão | [`src/lib/report-print-token.ts`](../../src/lib/report-print-token.ts) |
| Análise IA (Claude) | [`src/lib/report-ai-analysis.ts`](../../src/lib/report-ai-analysis.ts) |
| Narrativa/recomendações heurísticas | [`src/lib/report-narrative.ts`](../../src/lib/report-narrative.ts) |
| Breakdowns de público (Meta) | [`src/lib/report-breakdown-data.ts`](../../src/lib/report-breakdown-data.ts), [`src/lib/report-breakdown-layout.ts`](../../src/lib/report-breakdown-layout.ts) |
| Performance de criativos no relatório | [`src/lib/report-creatives-performance.ts`](../../src/lib/report-creatives-performance.ts) |
| Períodos / presets | [`src/lib/report-period.ts`](../../src/lib/report-period.ts) |
| Ordem dos KPIs (persistência local) | [`src/lib/report-kpi-order.ts`](../../src/lib/report-kpi-order.ts) |
| Envio de e-mail | [`src/lib/report-notify.ts`](../../src/lib/report-notify.ts) |
| Entidade do agendamento | [`src/db/entities/ReportSchedule.ts`](../../src/db/entities/ReportSchedule.ts) |
| Gating por plano | [`src/lib/billing/nav-permissions.ts`](../../src/lib/billing/nav-permissions.ts), [`src/lib/billing/entitlements.ts`](../../src/lib/billing/entitlements.ts), [`src/lib/billing/types.ts`](../../src/lib/billing/types.ts) |

## Elementos da tela / componentes

### `ReportsClient` — [src/components/ReportsClient.tsx](../../src/components/ReportsClient.tsx)
Componente cliente que orquestra toda a tela. Lê filtros do **Command Strip** (`useCommandStripOptional`): cliente, conta e período. Esconde os filtros nativos do strip (`useCommandStripPage({ hideFilters: true, hideSync: true })`) e renderiza filtros próprios.
- **Estado principal:** `reportType` ("simple" | "complete"), `selectedMetrics` (KPIs), `kpiOrder` (ordem persistida em localStorage), `preview` (payload carregado), `schedules` (lista de agendamentos), e estados de formulário de agendamento.
- **Comportamento notável:**
  - Auto-seleciona o primeiro cliente se nenhum estiver selecionado.
  - Ajusta o período automaticamente conforme o tipo: relatório Completo força `last30`/`custom`; relatório Simples reverte para `thisWeek` quando estava em `last30`.
  - Limpa o preview quando cliente/conta/período mudam.
  - "Pré-visualizar"/"Atualizar pré-visualização" chama `loadPreview()` → GET [`/api/reports/preview`](../../src/app/api/reports/preview/route.ts).
  - "Abrir view de impressão" abre `printViewUrl` (`/[locale]/report-print?...`) em nova aba.
  - CRUD de agendamentos: cria (`POST /api/report-schedules`), pausa/ativa (`PATCH`), exclui (`DELETE`).
- **Subcomponentes renderizados:** `DsPageHeader`, `FilterSelectDropdown` (cliente/conta/tipo), `PeriodFilter`, `ReportMetricPicker`, `ReportPreview`, e a tabela de agendamentos.

### `ReportMetricPicker` — [src/components/reports/ReportMetricPicker.tsx](../../src/components/reports/ReportMetricPicker.tsx)
- **Props:** `selected: MetricKey[]`, `onChange`, `compact?`.
- Pills selecionáveis (`DsSelectablePills`) com todas as métricas do `METRIC_CATALOG`. Mínimo de 1 selecionada. Botão "Restaurar" reseta para `["spend","clicks","cpm","ctr","conversions"]`.

### `ReportPreview` — [src/components/reports/ReportPreview.tsx](../../src/components/reports/ReportPreview.tsx)
Render canônico do relatório, usado tanto no preview (`variant="preview"`) quanto na view de impressão (`variant="print"`).
- **Props:** `data: ReportPreviewPayload`, `selectedMetrics`, `kpiMetrics`, `kpiEditMode`/`onKpiEditModeChange`/`onKpiReorder`, `reportType`, `periodQuery`, `adAccountId`, `initialCreativeGroups`, `initialBreakdownLayout`, `variant`.
- **Seções renderizadas:** cabeçalho (cliente, período, badge de preset/comparação); grid de KPIs (`ReportKpiGrid` + `ReportHighlightCard` com sparkline e delta vs. período anterior); narrativa/análise (badge "Análise Claude" quando há IA, com `keyFindings`); gráfico de performance (linhas) + gráfico comparativo (barras); gasto por campanha (pizza + tabela com share); breakdown de público (`ReportAudienceBreakdown`); resultados da meta (`goalMetric`); tendência de gasto comparada; recomendações (apenas Completo); ranking de criativos (`CreativesRankingView` embutido).
- O modo `print` aplica classes `report-print-*`/`report-pdf-*` para quebras de página e layout A4.

### Demais componentes de reports — [src/components/reports/](../../src/components/reports/)
`ReportKpiGrid` (grid reordenável de KPIs), `ReportHighlightCard` (card de KPI com sparkline), `ReportAudienceBreakdown` + `ReportBreakdownGrid` (breakdowns Meta), `ReportPrintReady` (sinaliza `data-report-print-ready="true"` quando charts/imagens carregaram — usado pelo Puppeteer), `ReportPrintToolbar` (barra de impressão exibida na view aberta manualmente).

## Geração/exportação de relatório (PDF)

Há **dois caminhos** de geração de PDF, com fallback:

1. **Puppeteer (caminho principal)** — [`src/lib/report-pdf-puppeteer.ts`](../../src/lib/report-pdf-puppeteer.ts) → `renderReportPdfWithPuppeteer`:
   - Cria um **token assinado** (HMAC-SHA256, TTL 5 min) via [`report-print-token.ts`](../../src/lib/report-print-token.ts) com tenant, cliente, conta, tipo, locale, período e métricas.
   - Abre `/{locale}/report-print?pdfToken=...` num Chromium headless (`puppeteer` local; `@sparticuz/chromium` + `puppeteer-core` em serverless/Vercel/Lambda).
   - Largura de impressão fixa `REPORT_PRINT_WIDTH_PX = 794` (A4). Espera o seletor `[data-report-print-ready="true"]` (emitido por `ReportPrintReady`) antes de chamar `page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true, ... })`.
   - Base URL via `REPORT_PRINT_BASE_URL` (fallback `getAppBaseUrl()`). Timeout `55s`.

2. **Fallback pdf-lib** — [`src/lib/report-generate.ts`](../../src/lib/report-generate.ts) → `buildReportPdfFromPreview` (e `buildClientReportPdf` para o cron): se o Puppeteer falhar, gera um PDF textual simples com `pdf-lib` a partir do payload do preview. Inclui sanitização de texto Unicode → WinAnsi (`sanitizePdfText`).

**Endpoint orquestrador:** [`POST /api/reports/pdf`](../../src/app/api/reports/pdf/route.ts) (`maxDuration = 90`):
- Resolve período (`resolveReportPeriodRanges`) e monta o preview (`buildReportPreview`).
- Tenta Puppeteer; em erro, cai no fallback pdf-lib; em erro duplo retorna 500.
- Se `email` for informado, envia o PDF anexado via [`sendReportEmail`](../../src/lib/report-notify.ts); senão retorna o binário `application/pdf` como download.

**Resumo WhatsApp:** [`POST /api/reports/whatsapp`](../../src/app/api/reports/whatsapp/route.ts) gera um texto curto (gasto/conversões/CPA/alertas críticos 7d) via `buildClientWhatsappSummary`.

## Dados, estado e API

### Fluxo de dados (server)
- [`buildReportPreview`](../../src/lib/report-preview-data.ts) é o núcleo: resolve o escopo do cliente/contas (`resolveDashboardScope`), carrega totais e séries diárias (`loadMetricTotals`, `loadMetricSeriesByDay` de `dashboard-query`), calcula a meta dominante do cliente (`dominantPresetForClient` + `ClientGoal`), gasto por campanha (`CampaignMetricSnapshot`), barras de comparação, narrativa, recomendações, breakdowns Meta e — no tipo **Completo** — a análise Claude.
- Tipos do payload em [`report-preview-types.ts`](../../src/lib/report-preview-types.ts) (`ReportPreviewPayload`, `ReportSummary`, `CampaignSpendRow`, `DEFAULT_REPORT_METRICS`).

### Endpoints
| Método/rota | Função |
| --- | --- |
| `GET /api/reports/preview` | Retorna `ReportPreviewPayload` (JSON) para a tela. |
| `POST /api/reports/pdf` | Gera PDF (Puppeteer→pdf-lib) e baixa ou envia por e-mail. |
| `POST /api/reports/whatsapp` | Texto-resumo do cliente para WhatsApp. |
| `GET/POST /api/report-schedules` | Lista / cria agendamentos do tenant. |
| `PATCH/DELETE /api/report-schedules/[scheduleId]` | Atualiza (ex.: `enabled`) / exclui. |
| `POST /api/cron/report-schedules` | Cron (auth `Bearer CRON_SECRET`): processa agendamentos vencidos, envia PDF/WhatsApp por e-mail, reagenda `nextRunAt` e dispara webhook opcional. |

Todos os endpoints da app usam `getAppContext()` para isolamento por tenant; o cron usa `CRON_SECRET`.

### Entidades / modelos
- [`ReportSchedule`](../../src/db/entities/ReportSchedule.ts): `tenantId`, `clientId?`, `name`, `format` (`pdf`|`whatsapp`), `frequency` (`daily`|`weekly`|`monthly`), `dayOfWeek?`, `hourUtc`, `recipients` (jsonb), `enabled`, `lastRunAt?`, `nextRunAt?`.
- Fontes de métricas: `MetricSnapshot` / `CampaignMetricSnapshot`, `ClientGoal`, `AdAccount`, `Client`, `Tenant`, `Alert`.

### Estado client-side
Ordem dos KPIs persistida em localStorage via [`report-kpi-order.ts`](../../src/lib/report-kpi-order.ts); layout de breakdown via [`report-breakdown-layout.ts`](../../src/lib/report-breakdown-layout.ts). Filtros (cliente/conta/período) vêm do Command Strip.

## Permissões / gating

- **Acesso à aba:** o layout [`reports/layout.tsx`](../../src/app/[locale]/(app)/reports/layout.tsx) usa `withPlanNavGate("reports")`, que valida o limite `allowNavReports` (ver [`nav-permissions.ts`](../../src/lib/billing/nav-permissions.ts)). Quando o plano não inclui, a navegação é bloqueada (mensagem i18n `nav.gating.reports`).
- **Planos** ([`src/lib/billing/types.ts`](../../src/lib/billing/types.ts)): `allowNavReports` é `false` no plano base/free e `true` nos pagos. `maxScheduledReports` varia por tier (ex.: `0`/`1`/`5`/`20`/ilimitado `-1`); add-ons podem somar via `extraScheduledReports` ([`tenant-addons.ts`](../../src/lib/billing/tenant-addons.ts)).
- **Entitlements:** o uso `scheduledReports` é contado e comparado com `maxScheduledReports` em [`entitlements.ts`](../../src/lib/billing/entitlements.ts) (`LIMIT_CHECKS.maxScheduledReports`).

## i18n

- Namespace principal: **`reports`** (ver [`messages/pt-BR.json`](../../messages/pt-BR.json) e [`messages/en.json`](../../messages/en.json), chave `"reports"`). Cobre títulos, tipos (`typeSimple`/`typeComplete`), labels de seção do `ReportPreview`, formulário e tabela de agendamentos, e textos da toolbar de impressão.
- Namespaces auxiliares usados na tela: `common`, `metrics`, `dashboard`, `campaignPresets`.
- Mensagem de gating em `nav.gating.reports` ("Relatórios não estão incluídos no seu plano atual.").

## Pendências / observações

- O `ReportsClient` **não** chama diretamente `POST /api/reports/pdf` na UI atual; a exportação ocorre via "Abrir view de impressão" (impressão pelo navegador) e o endpoint PDF é usado principalmente pelo cron/integrações. Confirmar se há botão de "baixar PDF" planejado na tela.
- O formulário de criação de agendamento na UI fixa `format: "pdf"` e `hourUtc: 12`; o backend já suporta `whatsapp`, `dayOfWeek` e outros `hourUtc` — recursos não expostos no formulário.
- A criação de agendamento (`POST /api/report-schedules`) **não** valida explicitamente `maxScheduledReports` na própria rota; o limite é avaliado via entitlements em outro ponto — verificar se o bloqueio é aplicado no submit.
- Geração de PDF via Puppeteer depende de `REPORT_PRINT_BASE_URL`/`getAppBaseUrl` acessível pelo Chromium headless; em serverless usa `@sparticuz/chromium`.
- A view de impressão (`/report-print`) aceita tanto `pdfToken` (assinado, server) quanto query params diretos (sessão autenticada do usuário).

## Histórico de mudanças relevantes

- 2026-06-24: Criação da documentação.
