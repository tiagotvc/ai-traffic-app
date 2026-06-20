# UX Pilot sync

Replica visual do export UX Pilot no app Next.js sem reescrever tela a tela.

## Fluxo

1. Exportar no UX Pilot → baixar zip
2. Extrair para `uxpilot-v2/` (substituir pasta)
3. Rodar:

```bash
pnpm sync:uxpilot
pnpm install
```

4. Comparar preview pixel a pixel:

```
/pt-BR/design-preview/dashboard
/pt-BR/design-preview/agency-brain
```

5. Produção usa adapters em `src/uxpilot-ui/adapters/` (não são sobrescritos pelo sync)

## Estrutura

| Pasta | Descrição |
|-------|-----------|
| `uxpilot-v2/` | Export bruto do UX Pilot (fonte) |
| `src/uxpilot-ui/` | Código sincronizado (gerado) |
| `src/uxpilot-ui/adapters/` | Ponte Next.js — **editar aqui** |
| `src/uxpilot-ui/pages/content/` | Páginas sem Sidebar/CommandStrip (shell do app) |

## O que o script faz

- Copia `components/`, `pages/`, `hooks/` de `uxpilot-v2/src`
- Ignora `components/ui/` (shadcn interno)
- Troca `react-router-dom` → `@/uxpilot-ui/adapters/navigation`
- Troca `@/lib/utils` → `@/uxpilot-ui/lib/utils`
- Adiciona `"use client"` onde necessário
- Gera `pages/content/*` sem shell (Sidebar + CommandStrip)
- Extrai animações/utilities para `styles.css`
- **Preserva** `adapters/` e `lib/utils.ts`

## Rotas de produção

| Rota | Adapter |
|------|---------|
| `/dashboard` | `DashboardView` → `DashboardContentLive` + `useDashboardData` |
| `/agency-brain` | `AgencyBrainView` → `BrainLearningsPage` (dados reais) |
| `/campaigns` | `CampaignsView` → `CampaignsHubClient` |
| `/clients` | `ClientsView` → `ClientsHubClient` |
| `/alerts` | `AlertsView` → `AlertsClient` |
| `/audiences` | `AudiencesView` → `AudiencesLookalikeClient` |
| `/creatives` | `CreativesView` → `CreativesLibraryClient` |
| `/reports` | `ReportsView` → `ReportsClient` |
| `/settings` | `SettingsView` → `ProfileClient` |
| `/campaigns/new` | `NewCampaignView` → `CampaignCreatorClient` |

Preview mock (sem dados reais): `/design-preview/[screen]`

## Variável de ambiente

```bash
UXPILOT_SRC=./outro-export/src pnpm sync:uxpilot
```

## Próximo passo (dados reais)

Componentes synced usam mock do UX Pilot. Para APIs reais, estender adapters (ex.: passar props para `MetricPrism`) sem editar arquivos gerados — ou gerar wrappers em `adapters/components/`.
