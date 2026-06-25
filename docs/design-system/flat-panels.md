# Painéis flat (Design System)

> Padrão visual extraído da tela **Configurações** (`/settings`).  
> Use em preferências, perfil, billing embedded, wizards de conta e qualquer tela com **conteúdo no fundo** (sem card wrapper global).

Implementação: [`src/design-system/`](../../src/design-system/index.ts) · tokens em [`globals.css`](../../src/app/globals.css) (`--ui-accent*`).

## Quando usar

| Use painéis flat | Use cards (`DsCard` / `.ui-card`) |
|------------------|-----------------------------------|
| Configurações, perfil, sub-abas de plano | Dashboards, KPIs, tabelas densas |
| Listas de integrações / equipe | Modais e drawers |
| Empty states leves no fundo da página | Formulários isolados em marketing |

## Token de accent temático

`--ui-accent` muda automaticamente com o tema:

| Modo | Cor |
|------|-----|
| **Light** | Âmbar (`--amber-bright`) |
| **Dark** | Roxo (`--violet-bright`) |

Tokens relacionados: `--ui-accent-muted`, `--ui-accent-border`, `--ui-accent-hover`, `--ui-accent-gradient`, etc.

**Nunca** hardcode `rgba(124,58,237,…)` em telas novas — use os tokens.

## Composição de uma tela

```
DsPageHeader (ícone + título)
DsTabBar (abas primárias em pílula)
DsFlatPanel (centered opcional)
  ├─ DsUnderlineTabs (sub-abas)
  └─ conteúdo
       ├─ DsFlatSection
       ├─ DsFlatDivider
       ├─ DsFlatSection + DsAccentOutlineLink
       └─ DsFlatEmptyState
```

### Exemplo mínimo

```tsx
import {
  DsFlatPanel,
  DsFlatSection,
  DsFlatDivider,
  DsPageHeader,
  DsTabBar,
  DsUnderlineTabs
} from "@/design-system";

export function AccountSettings() {
  return (
    <DsFlatPanel centered>
      <DsPageHeader title="Configurações" subtitle="…" titleIcon={<Settings size={16} />} />
      <DsTabBar tabs={tabs} active={tab} onChange={setTab} />
      <DsUnderlineTabs tabs={subTabs} active={sub} onChange={setSub} accent="brand" />
      <DsFlatSection title="Conta" subtitle="E-mail e senha">
        {/* campos */}
      </DsFlatSection>
      <DsFlatDivider />
      <DsFlatSection title="White-label" subtitle="Marca do workspace">
        {/* campos */}
      </DsFlatSection>
    </DsFlatPanel>
  );
}
```

## Componentes

| Componente | Uso |
|------------|-----|
| `DsFlatPanel` | Container `space-y-8`; prop `centered` → `max-w-5xl mx-auto` |
| `DsFlatDivider` | Linha `border-t` entre seções |
| `DsFlatSection` | Título + subtítulo + conteúdo; `tone="danger"` para zonas destrutivas |
| `DsEyebrow` | Label caps (`SEU PLANO ATUAL`) |
| `DsFlatChip` | Chip com ícone (`+1 cliente`, limites) |
| `DsAccentOutlineButton` / `DsAccentOutlineLink` | CTA outline accent (`Comprar limites →`) |
| `DsFlatEmptyState` | Ícone + título + descrição (histórico vazio, etc.) |
| `DsUnderlineTabs` | Sub-abas com underline; `accent="brand"` (padrão) ou `"amber"` |
| `DsFormField` | Label + campo (`ui-label` + children) |
| `DsFormActions` | Botões alinhados à direita + mensagem |
| `DsTabBar` | Abas primárias em pílula (topo da página) |
| `DsPageHeader` | Título de página com ícone accent |

## Padrões visuais

### Tipografia de seção

- **Eyebrow**: `DsEyebrow` — 11px, caps, `--text-dimmer`
- **Título de seção**: `font-heading text-sm font-semibold`
- **Subtítulo**: `text-xs text-[var(--text-dim)]`
- **Hero de plano** (caso especial): `text-4xl font-extrabold` no nome do plano

### Chips e cards de limite

```tsx
<DsFlatChip icon={<User size={14} />} label="+1 cliente" />
```

Grid de limites: `rounded-xl border bg-[var(--surface-card)]` **sem** `shadow-sm`.

### Tabelas flat

- `thead` com `border-b`, fundo transparente (`--surface-thead` se necessário)
- Hover: `--row-hover` ou `--ui-accent-hover` na linha expandida
- Botões de detalhe: `DsAccentOutlineButton`

### Formulários e CTAs em painéis flat

- **Checkbox/radio**: `accent-color: var(--ui-accent)` (global em `globals.css`)
- **Botão primário da seção**: classe `.ui-btn-accent` ou `<DsButton variant="accent">` — gradiente âmbar no light, roxo no dark
- **Não usar** `ui-btn-brand` em Configurações (sempre violeta); **não usar** `ui-btn-primary` se quiser accent temático (sempre âmbar)

```tsx
<button type="submit" className="ui-btn-accent px-3 py-1.5 text-xs">Salvar</button>
// ou
<DsButton variant="accent" size="sm">Salvar</DsButton>
```

```tsx
<DsFlatSection title="Resetar dados" subtitle="…" tone="danger">
  <button className="… border-rose-500/30 bg-rose-500/10 text-rose-400">…</button>
</DsFlatSection>
```

## Migração de código legado

| Legado | Substituir por |
|--------|----------------|
| `SettingsSection variant="flat"` | `DsFlatSection` |
| `SettingsFlatDivider` | `DsFlatDivider` |
| `SettingsField` | `DsFormField` |
| `SettingsSaveRow` | `DsFormActions` |
| `PageTabs` | `DsUnderlineTabs` (re-export em `PageTabs.tsx`) |

## Referência viva

- Layout: [`SettingsContentLive.tsx`](../../src/uxpilot-ui/adapters/SettingsContentLive.tsx)
- Plano / billing: [`BillingPortalClient.tsx`](../../src/components/billing/BillingPortalClient.tsx)
- Doc da tela: [configuracoes/README.md](../configuracoes/README.md)

## Histórico

- 2026-06-23: Componentes flat extraídos do redesign de Configurações para o DS + documentação.
