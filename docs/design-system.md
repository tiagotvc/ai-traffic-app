# Traffic AI — Design System (UX Pilot v1)

Referência visual: `uxpilot-export/` (export UX Pilot).  
Implementação: `src/app/globals.css`, `src/design-system/`, classes `ui-*`.

## Princípios

1. **Light mode** na área principal (`--surface-bg: #F8FAFC`, cards brancos).
2. **Sidebar sempre escura** (`--sidebar-bg: #0a0f14`) — contraste intencional.
3. **Âmbar** = ação primária (sync, criar, salvar, CTA principal).
4. **Violeta** = IA / Agency Brain / links interativos.
5. **Tipografia**: `font-heading` (Space Grotesk) títulos; `font-body` (DM Sans) corpo.

## Tokens CSS (usar via `var(--token)`)

| Token | Uso |
|-------|-----|
| `--surface-bg` | Fundo da página |
| `--surface-card` | Cards, painéis |
| `--surface-header` | Headers sticky / command strip |
| `--surface-thead` | Cabeçalho de tabela |
| `--border-color` | Bordas padrão |
| `--text-main` | Texto principal |
| `--text-dim` | Texto secundário |
| `--text-dimmer` | Labels, captions |
| `--amber` / `--amber-bright` | Brand primário, nav ativo |
| `--violet` / `--violet-bright` | IA, links |
| `--success` / `--danger` | Delta positivo / negativo |
| `--brain-shelf-bg` | Bloco Agency Brain |

## Classes utilitárias (`globals.css`)

### Superfícies
- `.ui-card` — card padrão (rounded-2xl, border, shadow-sm)
- `.ui-surface` — fundo de página
- `.ui-panel-header` — barra sticky com blur
- `.ui-brain-shelf` — container Agency Brain

### Botões
- `.ui-btn-primary` — CTA âmbar (gradiente) — **padrão para ações principais**
- `.ui-btn-brand` — CTA violeta — **ações de IA**
- `.ui-btn-secondary` — secundário
- `.ui-btn-ghost` — ghost
- `.ui-btn-danger` — destrutivo

### Formulários
- `.ui-input`, `.ui-select`, `.ui-textarea`, `.ui-label`

### Alertas
- `.ui-alert-warning`, `.ui-alert-info`, `.ui-alert-danger`, `.ui-alert-success`

### Links
- `.ui-link` (violeta), `.ui-link-amber`

### Sidebar
- `.sidebar-item-active`, `.sidebar-item-idle`
- `.sidebar-sub-active`, `.sidebar-sub-idle`

### Animação
- `.kpi-card-hover`, `.animate-fade-up`, `.skeleton-shimmer`

## Componentes React (`src/design-system/`)

```tsx
import {
  DsBadge,
  DsButton,
  DsCard,
  DsPageHeader,
  DsSectionHeader,
  DsTableHeadCell,
  DsTableRow,
  DsTableShell,
  DsTrendBadge
} from "@/design-system";
```

| Componente | Quando usar |
|------------|-------------|
| `DsPageHeader` | Título de página + ações |
| `DsSectionHeader` | Título de seção dentro da página |
| `DsCard` | Card com padding/hover opcional |
| `DsButton` | Botão com variantes do DS |
| `DsBadge` | Status pills (success, warning, beta…) |
| `DsTrendBadge` | Delta ▲▼ com cor semântica |
| `DsTableShell` | Tabela com header styled |

## Padrões por tipo de tela

### Dashboard / KPIs
- Grid 3 colunas hero KPI com `.kpi-card-hover`
- Sparkline colorida por métrica (âmbar spend, verde CPL, violeta ROAS)
- Secondary metrics em chips `.ui-card` compactos

### Tabelas (Campanhas, Clientes)
- Wrapper `DsTableShell` ou `.ui-card overflow-hidden`
- `thead` com `--surface-thead`
- Hover row `--row-hover`
- Status pills via `DsBadge`

### Agency Brain
- Feed em `.brain-insights-scroll`
- Hero compacto, stats inline
- Refinar = `.ui-btn-brand`
- Cards categoria com tags coloridas por bucket

### Alertas / Atrito
- Crítico: `.ui-alert-danger`
- Atenção: `.ui-alert-warning`
- IA pendente: `.ui-alert-info`

## O que NÃO fazer

- Não usar `bg-violet-600` como CTA principal → use `.ui-btn-primary`
- Não usar `bg-[#f4f6f9]` hardcoded → use `bg-[var(--surface-bg)]` ou `.ui-surface`
- Não usar cyan no nav ativo → use âmbar (`sidebar-item-active`)
- Não criar cards com `border-slate-200` solto → prefira `.ui-card`
- Não misturar tipografia sans genérica em títulos → use `font-heading`

## Manutenção

Script de migração em massa (tokens legados → DS):

```bash
node scripts/migrate-design-system.mjs
```

Rodar após imports do UX Pilot ou quando encontrar classes `slate-*` / `violet-*` soltas.

## Exceções intencionais (não migrar)

- **Sidebar avatar** — gradiente violeta (`SidebarFooter`)
- **Login / Connect marketing panels** — superfície escura com gradiente violeta (auth)
- **Billing premium cards** — hero gradiente violeta em upgrade/checkout (`billing-ui.tsx`)
- **Categorias semânticas** — cores por bucket em `learning-visuals.ts`, `learning-lens-catalog.ts`
- **Status neutros** — `slate-100/300/400` em badges de status cancelado/inativo

## Referência UX Pilot


Screens de referência em `uxpilot-export/src/pages/`:
- `Dashboard.tsx`, `Campaigns.tsx`, `Clients.tsx`, `AgencyBrain.tsx`
- `Alerts.tsx`, `Settings.tsx`, `Reports.tsx`, `Creatives.tsx`, `NewCampaign.tsx`

Componentes reutilizáveis do mock: `MetricPrism`, `CommandStrip`, `BrainShelf`, `AgencyHealthLayout`.
