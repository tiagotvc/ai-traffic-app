# Plano de melhorias — Relatórios & Dashboard

> Análise do que temos hoje + **cruzamento com concorrentes** + plano priorizado para evoluir
> **relatórios** e **dashboard**. Fonte de verdade deste roadmap. Captado em 2026-06-27.
> Restrição de produto respeitada: **não mexer em públicos, ranking, criação de campanha/anúncio/
> criativo** ("já está redondinho"). Onde o ranking alimenta widgets, qualquer mudança é aditiva.

## 1. Onde estamos (resumo do código)

**Relatórios** (`src/lib/report-*`, `src/components/Reports*`, `/api/reports`):
- 2 tipos: **simples** (KPIs + narrativa de regras) e **completo** (+ IA Claude, breakdowns, campanhas).
- Export: **PDF** (Puppeteer + fallback pdf-lib) e **resumo WhatsApp** (texto). Link via token HMAC 5min.
- Agendamento: `ReportSchedule` (daily/weekly/monthly, e-mail via Resend).
- Breakdowns: gênero / idade / device (Meta Graph).
- IA: análise Claude só no "completo" (executiveSummary + findings + recomendações), com fallback de regras.
- Comparação: período anterior 1:1.

**Dashboard** (`src/components/dashboard/**`, `src/lib/dashboard/**`):
- **Destaques** (fixo, personalizável em 6 dimensões via modal): alerta do Cérebro, KPIs heróis, métricas
  secundárias, gráfico de performance, faixa etária.
- **Visões** (canvas de widgets): infra 100% operacional — **61 tipos de widget**, grid 12 col, templates,
  permissões por plano/addon (Master Blaster), compartilhamento por token (white-label básico), widgets de IA
  (agency brain, account health, correlação) e **builder por linguagem natural** (`ai-widget-inference.ts`).

## 2. Cruzamento com concorrentes

| Capacidade | Reportei | AgencyAnalytics | Whatagraph | Swydo / DashThis | **Nós hoje** |
|---|---|---|---|---|---|
| Export PDF | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Export CSV/Excel** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **White-label completo** (logo, cores, domínio) | ✅ | ✅ (incluso) | ✅ (auto branding) | ✅ | 🟡 só texto+cor fixa |
| **Relatório por IA / chat→relatório** | ✅ (MCP + chat) | ✅ | ✅ (18 idiomas) | ✅ | 🟡 temos IA no completo, sem "gerar por prompt" |
| **MCP** (conectar IA externa aos dados) | ✅ | — | ✅ | — | ✅ **(já temos!)** |
| Multi-canal (Google/TikTok além de Meta) | ✅ | ✅ (85+) | ✅ | ✅ | ❌ (Meta-first) |
| **Consolidado de agência** (multi-cliente) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Templates de relatório | ✅ (5) | ✅ | ✅ (linked) | ✅ | 🟡 só dashboard |
| Comparação YoY | ✅ | ✅ | ✅ | ✅ | ❌ (só período anterior) |
| Anomaly flagging (IA avisa antes do cliente) | ✅ | ✅ | ✅ | ✅ | 🟡 alertas/regras, sem "anomalia IA" |
| **Dashboard canvas editável** | 🟡 | ✅ | ✅ | 🟡 | ✅ **(muito forte — 61 widgets)** |
| **CAPI (conversões server-side)** | ❌ | ❌ | ❌ | ❌ | ✅ **(diferencial — ferramentas de report não têm)** |
| Preço de referência | ~R$250 + IA extra | $25–79/cliente | $229/mês | $69/mês | — |

**Leitura:** nosso **dashboard canvas** e o **Agency Brain + MCP + CAPI** são diferenciais reais que
a maioria dos concorrentes de *reporting* não tem. Onde ficamos atrás é no **básico de relatório de
agência**: CSV, white-label de verdade, consolidado multi-cliente, templates de relatório, YoY e o
"gerar relatório por IA" (o feature-vitrine do Reportei). A boa notícia: **já temos as peças** (AI
router Gemini+Claude, MCP, brandName/logoUrl no `Tenant`) para fechar a maioria desses gaps rápido.

## 3. Plano — RELATÓRIOS

### R1 — Paridade competitiva (quick wins, alto valor) 🥇
1. ✅ **Export CSV** — [`/api/reports/export`](../../src/app/api/reports/export/route.ts) reusa
   `buildReportPreview` e serializa Resumo + Série diária + Campanhas (BOM p/ Excel). Botão **Exportar
   CSV** no [`ReportsClient`](../../src/components/ReportsClient.tsx).
2. ✅ **White-label (logo)** — `tenant.logoUrl` + nome de marca no header do relatório
   ([`ReportPreview`](../../src/components/reports/ReportPreview.tsx) + bundle em `report-print-data.ts`).
   _Cor de marca / override por cliente_ = R3 (precisa de campo `brandColor` no Tenant).
3. 🟡 **Segurança do print token** — é um **token de capacidade assinado (HMAC) e curto (5 min)**,
   criado **atrás de auth** e escopado a tenant+cliente. Risco baixo; hardening futuro: nonce de uso
   único. _Mantido como está por ora._
4. ✅ **Enforce `maxScheduledReports`** — POST de `report-schedules` agora chama `assertLimit`
   (+`billingErrorResponse`). Brecha fechada.
5. 🟡 **Histórico de agendamento** — depende do runner de agendamento (não no escopo deste lote);
   `nextRunAt` já é gravado na criação. Log de envio = próximo passo (padrão `CapiEventLog`).

### R2 — Diferenciação por IA 🥈 — ✅ **FEITO**
6. ✅ **"Relatório por IA"** — input de prompt no [`ReportsClient`](../../src/components/ReportsClient.tsx)
   → [`/api/reports/ai-config`](../../src/app/api/reports/ai-config/route.ts) usa o AI router
   (`aiGenerateJson`, task `extraction`) p/ extrair cliente+período+tipo+métricas → aplica e gera o
   preview automaticamente.
7. ✅ **Análise de IA roteada** — [`report-ai-analysis.ts`](../../src/lib/report-ai-analysis.ts) agora usa
   `aiGenerateJson({task:{kind:"analysis"}})` (Claude Sonnet quando habilitado, fallback Gemini); o
   badge mostra o provedor real.
8. ✅ **Anomaly flagging** — `anomalies` no payload (desvio ≥25% vs período anterior, classificado
   bom/ruim por métrica) + banner no topo do [`ReportPreview`](../../src/components/reports/ReportPreview.tsx).
9. ✅ **Insights por ROI** — a seleção de campanhas enviada à IA é rankeada por **CPA/eficiência**
   (prioriza quem converte), não só por gasto.

### R3 — Escala de agência 🥉 (em andamento)
10. ✅ **Consolidado multi-cliente** — [`buildAgencyConsolidated`](../../src/lib/report-preview-data.ts)
    + [`/api/reports/consolidated`](../../src/app/api/reports/consolidated/route.ts) (gate `reports.v2`) +
    painel [`ReportsConsolidatedPanel`](../../src/components/reports/ReportsConsolidatedPanel.tsx)
    (modal: tabela cliente × investimento/conversões/CPA/ROAS/CTR + total + export CSV). Só leitura de
    snapshots — **não toca ranking/criação**.
11. ✅ **Templates de relatório** — entidade [`ReportTemplate`](../../src/db/entities/ReportTemplate.ts)
    (migração `0056`) + CRUD [`/api/report-templates`](../../src/app/api/report-templates/route.ts) (+`[id]`)
    + UI [`ReportsTemplatesControl`](../../src/components/reports/ReportsTemplatesControl.tsx) (salvar
    atual / aplicar / excluir). Salva **tipo + métricas + período**. Tudo gated `reports.v2`.
12. ✅ **Agendamento parametrizável + entrega ao cliente (v3)** — ver seção abaixo.
13. 🟡 **YoY** — próximo (comparação "ano anterior" threaded em preview + CSV + PDF).

## v3 — Agendamento parametrizável + entrega ao cliente (2026-06-28)

Agendamento agora guarda **tipo + período + canal + telefone** (migração `0057`) e o cron entrega pelo
**canal escolhido**, cada um atrás de **feature flag** (admin decide quais oferecer; o usuário escolhe
entre os habilitados):

- Flags: `reports.v3` (pai) + `reports.v3.emailPdf` + `reports.v3.emailLink` + `reports.v3.whatsapp`.
- Canais ([`report-delivery.ts`](../../src/lib/report-delivery.ts), flag-gated, skip se desligado/sem config):
  - **email_pdf** — PDF anexo (Resend).
  - **email_link** — e-mail com **link público estável** (token de 90 dias → `/report-print?pdfToken=`).
  - **whatsapp** — WhatsApp Business Cloud API (resumo + link; requer `WHATSAPP_TOKEN`/`WHATSAPP_PHONE_ID`).
- Cron [`/api/cron/report-schedules`](../../src/app/api/cron/report-schedules/route.ts) usa
  `deliverScheduledReport`. UI: o form de agendamento ([`ReportsClient`](../../src/components/ReportsClient.tsx))
  mostra só os canais habilitados (via `/api/reports/flags`) + tipo + período + telefone (WhatsApp).
12. **Customização de seções** + **YoY** — escolher quais seções entram e comparar com ano anterior.
13. **Schedule parametrizável** — hoje agenda sempre o relatório "padrão"; permitir tipo/período/métricas
    por agendamento (campos novos em `ReportSchedule`).

## 4. Plano — DASHBOARD

### D1 — Destravar o que já existe 🥇
1. **Ligar o módulo Visão / editor** — a infra do canvas existe e funciona em `/dashboard/views`, mas o
   editor inline das Destaques está com flag `HIGHLIGHTS_LAYOUT_EDITOR_V2 = false` e o
   `DashboardHighlightsCanvasLive` não é renderizado. Estabilizar o seed e ligar (com cuidado p/ não
   "piscar" layout antigo).
2. **Implementar os widgets "coming soon"** — `campaigns.top`, `creatives.top` (dados já existem no
   ranking/insights — **somente leitura**, sem tocar a lógica de ranking), `productivity.timeline/goals`.
3. **Persistir dispensa de alerta** — hoje o "X" do card do Cérebro é só sessão; gravar por usuário (DB).

### D2 — Profundidade 🥈
4. **Drill-down** — clicar num card/segmento abre o detalhe (ex.: faixa etária → conversões por idade).
5. **Período por widget** — o config já existe (`widget-period.ts`), falta expor no painel de propriedades.
6. **AI Builder exposto** — já temos `inferWidgetFromPrompt`; expor "descreva o widget que quer" na UI
   (gate por plano que já existe). Diferencial direto vs concorrentes.
7. **Widget de anomalias** — card "o que mudou" (quedas/altas relevantes no período), alimentado por IA.

### D3 — Tempo real & alcance 🥉
8. **Dados live nos widgets de IA** — hoje usam snapshot (1–2 dias atrás); permitir Meta ao vivo
   (`allowLiveMeta`, plano Advanced+).
9. **Mobile edit** + **snapshot agendado do dashboard em PDF** (cruza com R1: dashboard → PDF no e-mail).

## 5. Sequência recomendada (impacto × esforço)

1. **R1.1 CSV** + **R1.2 white-label** + **R1.3 segurança token** — baratos, fecham gaps citados e um risco de segurança.
2. **R2.7 rotear IA pelo router** — quase de graça (já temos o router), corta custo e melhora qualidade.
3. **D1.1 ligar Visão** + **D1.2 widgets coming-soon** — destrava valor já construído (alto impacto, esforço médio).
4. **R2.6 relatório por IA** — feature-vitrine (paridade Reportei) usando MCP + router que já temos.
5. **R3.10 consolidado de agência** + **R3.11 templates de relatório** — escala de agência.
6. Resto (YoY, drill-down, anomalias, live, mobile) conforme tração.

## 6. Princípios
- **Aproveitar o que já construímos**: AI router (Gemini+Claude), MCP, CAPI, canvas de widgets, templates
  de dashboard, `tenant.logoUrl`. A maioria dos gaps fecha **compondo**, não construindo do zero.
- **Não tocar** em ranking/públicos/criação (constraint). Widgets de campanha/criativo = **somente leitura**.
- **Multi-canal (Google/TikTok)** fica **fora de escopo agora** (Meta-first é o fosso); reavaliar depois.

## Fontes (concorrentes)
- [Reportei — relatórios/dashboards Meta Ads](https://reportei.com/relatorios-e-dashboards-de-meta-ads/),
  [Reportei — IA](https://reportei.com/inteligencia-artificial-2/),
  [Reportei — MCP Meta Ads](https://reportei.com/mcp-meta-ads/)
- [Swydo — best PPC reporting tools 2026](https://www.swydo.com/blog/best-ppc-reporting-tools/),
  [Swydo — best AI reporting tools](https://www.swydo.com/blog/best-ai-reporting-tools/)
- [Whatagraph — AgencyAnalytics alternatives](https://whatagraph.com/blog/articles/agencyanalytics-alternatives-and-competitors)

## Split v1 / v2 por feature flag (2026-06-27)

Relatórios separados em **dois caminhos desligáveis independentemente**:
- **`reports.v1`** — clássico (sem IA): KPIs, gráficos, breakdowns, export CSV/PDF, agendamento.
- **`reports.v2`** — com IA: **gerar por IA** (`/api/reports/ai-config`), **análise/insights por IA**
  (`report-ai-analysis` roteado), **destaques de anomalia** e insights por ROI.

Aplicação:
- **Servidor (enforcement):** `buildReportPreview` só gera `aiAnalysis`/`anomalies` se `reports.v2`;
  `/api/reports/ai-config` retorna 404 se `reports.v2` off. (v1 nunca depende de IA.)
- **UI:** `ReportsClient` lê [`/api/reports/flags`](../../src/app/api/reports/flags/route.ts) e esconde
  o trigger de IA (v2) ou os controles manuais/Visualizar + métricas (v1) conforme cada flag.
- Desligar o pai `reports` cascateia nos dois. Desligar só v1 → fica só o fluxo por IA; só v2 → volta
  ao relatório clássico. Sem quebra em nenhum dos casos.

## Histórico
- 2026-06-28 (parte 3): **v3 — agendamento parametrizável + entrega ao cliente** (3 canais
  email_pdf/email_link/whatsapp, cada um por feature flag; migração 0057; `report-delivery.ts`; cron
  e UI atualizados). YoY = próximo.
- 2026-06-28 (parte 2): **R3 — templates de relatório** (`ReportTemplate` + migração 0056 + CRUD + UI
  salvar/aplicar/excluir), gated `reports.v2`. R3 (consolidado + templates) concluído.
- 2026-06-28: **R3 — consolidado de agência** (builder + endpoint + painel modal com tabela e CSV),
  atrás de `reports.v2`. Templates de relatório = próximo.
- 2026-06-27 (parte 4): **split v1/v2 por feature flag** (`reports.v1`/`reports.v2`) com gate de
  servidor (build + ai-config) e de UI (`/api/reports/flags`).
- 2026-06-27 (parte 3): **R2 implementado** — relatório por IA (`/api/reports/ai-config` + input),
  análise roteada pelo AI router, anomaly flagging (banner) e insights por ROI. (D1/Visão ficou de fora
  a pedido.)
- 2026-06-27 (parte 2): **R1 implementado** — export CSV (`/api/reports/export` + botão), white-label
  com logo do tenant no relatório, e enforce de `maxScheduledReports`. R1.3 (token) e R1.5 (histórico)
  avaliados e mantidos/deferidos com justificativa.
- 2026-06-27: análise + cruzamento com concorrentes + plano priorizado (R1–R3 relatórios, D1–D3 dashboard).
