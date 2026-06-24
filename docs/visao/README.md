# Visão — módulo de dashboards editáveis

> **Status:** documentação de produto/arquitetura (em construção). O Visão ainda não está
> implementado como módulo próprio; este doc define o alvo. Os componentes-base já existem no
> dashboard (`src/components/dashboard/`) e devem ser reaproveitados.

## Conceito

No **Dashboard (Destaques)** os elementos são fixos e curados. No **Visão**, **cada elemento é
um componente** que o usuário pode **adicionar, remover, posicionar e editar 100%**: tipo de
visualização, dados/métricas, cruzamentos, cores, fontes, comparações, e — no caso de alertas —
ícone, gatilho e forma de destaque.

Princípios:

- **Tudo é componente.** Cada elemento do dash vira um "widget" configurável no Visão.
- **Mesma base de código.** Reusar os componentes de `src/components/dashboard/` (já aceitam
  `visual?: SlotVisualConfig`, `chartStyle`, `embedded`, etc.) em vez de reescrever.
- **Configuração serializável.** Cada widget guarda sua config (tipo, métricas, visual, alerta)
  e é persistida por usuário/cliente.

---

## Catálogo de componentes

Cada componente abaixo lista: base de código existente, o que é **editável no Visão** e o que
hoje é fixo no dash.

### Componente: Card de alerta

- **Base:** `BrainShelf.tsx` (`variant="notice"`) — primeiro exemplo do **tipo "alerta"**.
- **Ideia:** um tipo genérico de card de alerta que pode ser disparado por **qualquer feature**
  (brain, performance, orçamento, etc.), não só pelo Cérebro da agência.

**Editável no Visão:**

- **Ícone inicial:** escolhível (no dash é fixo `Sparkles`).
- **Origem/gatilho do alerta:** de qual feature vem e a condição que o dispara
  (ex.: "há aprendizados pendentes", "CPA acima do alvo", "orçamento estourando").
- **Número/contador:** qual quantidade exibir (aprendizados, hipóteses, ou métrica da feature).
- **Forma de destaque:** o que pulsa para indicar alerta — o **número** (badge `animate-ping`),
  o **card inteiro**, ou nenhum. Cor do destaque editável.
- **CTA (texto + destino):** **dependente do tipo de alerta**, ancorado à direita no fim do card
  (no brain: "Ver no Cérebro da agência →").
- **Dispensar (X):** o card pode ser fechado; no Visão a dispensa deve ser **persistida**
  (não só por sessão como no dash).
- **Visibilidade condicional:** o card só aparece quando há alerta real (mesma regra do dash).

**Config sugerida (serializável):**

```ts
type AlertWidgetConfig = {
  source: "brain" | "performance" | "budget" | string; // feature de origem
  icon: string;            // nome do ícone (lucide)
  iconColor: string;
  countSource: "learnings" | "hypotheses" | "metric" | string;
  pulse: "number" | "card" | "none";
  accentColor: string;
  cta: { label: string; href: string };
  dismissible: boolean;    // dispensa persistida
};
```

> Já existe um esqueleto em `src/lib/dashboard/alert-widget-config.ts` — alinhar a config final com ele.

---

### Componente: KPI card (com comparação)

- **Base:** `MetricPrism.tsx` (`KpiCardTile`).
- **Hoje no dash:** valor + comparação com período anterior + sparkline (96px). Fixo.

**Editável no Visão:**

- **Tipo de gráfico interno** (sparkline, barra, linha, mini-área…).
- **Cruzamento com outra métrica** (ex.: gasto × conversões no mesmo card).
- **Cor, fonte, tamanho de fonte** (já suportado via `SlotVisualConfig`: `fontFamily`,
  `fontSize`, `textColor`, `accentColor`).
- **Quais dados aparecem** (valor, variação, sub-label, período de comparação).
- **Métrica exibida** e janela de comparação.

---

### Componente: Métrica simples (sem comparação)

- **Base:** `CanvasMetricStrip.tsx` (`CompactMetricCard`).
- **Hoje no dash:** card compacto, grid de até 6/linha responsivo, tooltip no valor truncado.

**Editável no Visão:**

- Variação do KPI card (mais enxuta) — cor, fonte, métrica, casas decimais, com/sem dot.
- Quantidade por linha e quebra.

---

### Componente: Gráfico comparativo

- **Base:** `DashboardPerformanceChart.tsx` + `PerformanceChartBody` + `PremiumChartRenderer.tsx`.
- **Hoje no dash:** área, até 3 métricas, altura ~320px.

**Editável no Visão:**

- **Tipo de gráfico:** `area` | `bar` (h/v) | `line` | `pie` | `donut` | `radar` | `composed` |
  `pareto` | `bullet` | `boxplot` (já implementados no `PerformanceChartBody`).
- **Métricas e cruzamentos**, cores por série (`visual.customColors`), espessura de linha/barra.
- **Legenda** (posição, ícone), **eixos** (lado esquerdo/direito por métrica em `composed`),
  cor de texto dos eixos.
- Configuração via prop `visual: SlotVisualConfig` (`src/lib/dashboard/slot-visual-config.ts`).

---

### Componente: Gráfico + tabela (breakdown)

- **Base:** `AgeBreakdownCard.tsx` (faixa etária) — modelo de "gráfico de barras + tabela".
- **Hoje no dash:** barras horizontais (gasto) + tabela (segmento/gasto/share/conversões/CPA).

**Editável no Visão:**

- **Dimensão do breakdown** (faixa etária, gênero, dispositivo, plataforma, etc.).
- **Tipo de gráfico** e **estilo da tabela**.
- **Métricas, comparações e cruzamentos** exibidos no gráfico e na tabela.
- Altura/proporção entre gráfico e tabela.

---

### Componente: Listagem de alertas (menu com listagem)

- **Base:** `LiveIntelligenceFeed.tsx` (removido do dash).
- **Hoje:** feed com 3 camadas — cabeçalho + abas de filtro (Todos/Alertas/Ganhos) + lista
  de eventos com ícone, título, detalhe, horário e link.

**No Visão:** documentar como **menu com listagem** configurável — quais tipos de evento
aparecem, filtros, ordenação, ações por item, densidade (stacked/inline). Itens podem usar o
mesmo "tipo alerta" do [Card de alerta](#componente-card-de-alerta).

---

### Componente: Saúde dos clientes (cards + tabela)

- **Base:** `AgencyHealthLayout.tsx` (removido do dash).
- **Hoje:** 4 cards de KPI agregados + tabela de clientes (gasto, ROAS, CPL, métrica foco, status).

**No Visão:** widget com cabeçalho de KPIs + tabela de entidades configurável (colunas,
métrica foco, ordenação, status/regra de saúde, link por linha).

---

## Infra reutilizável já existente

| Recurso | Arquivo | Uso |
|---|---|---|
| Config visual de slot | `src/lib/dashboard/slot-visual-config.ts` | cores, fonte, legenda, eixos, estilos de série. |
| Estilos de gráfico estendidos | `PremiumChartRenderer.tsx` | pareto, bullet, boxplot. |
| Config de widget | `src/lib/dashboard/widget-config.ts` | `ChartStyle` e afins. |
| Config de alerta (esqueleto) | `src/lib/dashboard/alert-widget-config.ts` | base do card de alerta. |
| Layout canvas (editável) | `src/uxpilot-ui/adapters/DashboardHighlightsCanvasLive.tsx` | referência de grid editável. |

## Pendências de produto

- Definir o schema final de persistência dos widgets do Visão.
- Persistir a dispensa de alertas por usuário.
- Definir o catálogo de gatilhos de alerta por feature.
- **Seed/catalog de widgets do canvas** (`src/lib/dashboard/highlights-layout-widgets.ts` e
  `highlights-widget-sync.ts`): hoje refletem o layout **antigo** da Destaques (com Alertas e
  saúde dos clientes). Quando o Visão for implementado em cima do `DashboardHighlightsCanvasLive`,
  atualizar esse seed para o layout novo (ver nota "Caminho de renderização" no
  [doc da Destaques](../dashboard-destaques/README.md)).
