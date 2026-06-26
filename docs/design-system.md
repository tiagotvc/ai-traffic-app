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
| `--amber` / `--amber-bright` | Brand primário, nav ativo, CTA |
| `--violet` / `--violet-bright` | IA, links legados |
| `--ui-accent` (+ muted, border, hover…) | **Accent temático**: âmbar no light, roxo no dark — use em painéis flat |
| `--ui-accent-btn-*` | CTA preenchido (`.ui-btn-accent`) — gradiente temático |
| `--success` / `--danger` | Delta positivo / negativo |
| `--brain-shelf-bg` | Bloco Agency Brain |

## Temas (admin)

Cores light/dark são configuráveis em **Admin → Temas / DS** (`/admin/platform/theme`).

- Defaults em `globals.css`; overrides em `platform_settings` (`design_system_theme_config`)
- Guia completo: **[design-system/themes.md](design-system/themes.md)**
- Regra: **light = accent âmbar**, **dark = accent roxo** (padrão Orion; customizável pelo admin)

## Classes utilitárias (`globals.css`)

### Superfícies
- `.ui-card` — card padrão (rounded-2xl, border, shadow-sm)
- `.ui-surface` — fundo de página
- `.ui-panel-header` — barra sticky com blur
- `.ui-brain-shelf` — container Agency Brain

### Botões (tokens `--ui-accent-btn-*` e `--ui-accent-border`)

| Classe | Uso | Light | Dark |
|--------|-----|-------|------|
| `.ui-btn-accent` / `.ui-btn-primary` | CTA preenchido (criar, publicar, nova campanha) | Âmbar | Roxo |
| `.ui-btn-accent-outline` | Sync, ações secundárias com cor de marca | Borda âmbar | Borda roxa |
| `.ui-btn-filter-toggle` | Mostrar filtros (sem fundo) | Borda neutra | Borda neutra |
| `.ui-btn-filter-toggle--open` | Ocultar filtros (painel aberto) | Borda accent | Borda accent |
| `.ui-btn-secondary` | Neutro sem cor de marca | — | — |
| `.ui-btn-brand` | IA / Agency Brain (violeta fixo) | — | — |

**Responsivo:** `.ui-btn-responsive` + `.ui-btn-responsive-label` — ícone no mobile/tablet; ícone + texto no desktop (lg+).

**Componentes:** `IconActionButton` (accent), `FilterToggleButton`, `MetaSyncButton` (outline), `DsButton` (`variant="accent" | "accentOutline"`).

**Filtros mobile:** `.ui-filter-panel-grid` — grid 1 coluna no mobile, 2 no tablet, inline no desktop.

**Tabelas de campanha (premium):** `.ui-campaign-table-shell`, `.ui-campaign-table`, `.ui-campaign-table-name` (accent), `.ui-campaign-table-tipo` (pill), `.ui-campaign-table-spend`, `.ui-campaign-metric--good/warn`.

**Toggle (`DsSwitch`):** trilho ativo usa `--toggle-track-on` → accent temático (âmbar light / roxo dark).

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
  DsFlatChip,
  DsFlatDivider,
  DsFlatEmptyState,
  DsFlatPanel,
  DsFlatSection,
  DsFormActions,
  DsFormField,
  DsPageHeader,
  DsSectionHeader,
  DsTabBar,
  DsUnderlineTabs,
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
| **`DsFlatPanel`** | Container flat (`space-y-8`); ver [flat-panels.md](design-system/flat-panels.md) |
| **`DsFlatSection`** | Seção flat com título/subtítulo (Configurações, perfil) |
| **`DsUnderlineTabs`** | Sub-abas com underline (`accent="brand"`) |
| **`DsTabBar`** | Abas primárias em pílula no topo |
| **`DsFlatChip`** | Chip com ícone (+1 cliente, limites) |
| **`DsFlatEmptyState`** | Empty state flat |
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
- Resumo contextual (ex.: totais de conjuntos): `.ui-alert-info` — âmbar no light, roxo no dark

### Visão interna de campanha (drilldown)
- Guia completo: **[campaigns/drilldown-ui.md](campaigns/drilldown-ui.md)**
- Header **sem fundo** — título + ações à direita (filtros + refresh)
- Metadados: `.ui-campaign-meta-pill` (pills coloridas abaixo do título)
- Período: colapsável via `FilterToggleButton` no header (oculto por padrão)
- KPIs: `.ui-kpi-card` (card com borda explícita)
- Filtros de tabela: `CampaignDetailFiltersPanel` abaixo do subtítulo (Conjuntos/Anúncios)
- Badge pausada: `Badge variant="accent"` (tema-aware)
- Refresh: `live=1` na campanha aberta — **não** sync global do cliente no header
- Scroll interno: classe `.ds-scroll` (5px, cor `--ui-accent`)

### Scrollbars (`.ds-scroll`)
- Largura 5px; thumb com `color-mix(--ui-accent)`
- Light: âmbar; dark: roxo
- Aplicar em: `AppShell` `<main>`, sidebars com overflow, tabelas horizontais

### Configurações / painéis flat
- Ver guia completo: **[design-system/flat-panels.md](design-system/flat-panels.md)**
- `DsFlatPanel` + `DsTabBar` + `DsUnderlineTabs` + `DsFlatSection`
- Accent via `--ui-accent` (nunca violeta hardcoded)

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

**Temas:** alterações visuais globais preferencialmente via Admin → Temas / DS ou editando `src/lib/design-system/theme-config.ts` (defaults). Evite hardcode de cores fora dos tokens.

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
