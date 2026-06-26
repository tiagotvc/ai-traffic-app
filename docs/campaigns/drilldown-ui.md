# Visão interna de campanha (drilldown UI)

Padrões para `/campaigns/[id]`, abas Conjuntos, Anúncios e Criativos.

## Estrutura de página

### Overview (`CampaignManagerClient`)

1. **Breadcrumb** — `.ui-breadcrumb` (margem inferior, texto dim)
2. **`CampaignDrilldownHeader`** `variant="full"` — título + badge + **ações à direita** (mostrar filtros + atualizar) + pills de meta + período colapsável
3. **`CampaignDetailTabs`**
4. Conteúdo (KPIs, gráfico, sidebar de conjuntos)

### Abas internas (Conjuntos, Anúncios, Criativos)

1. **`DsPageHeader`** — breadcrumb, título da aba, subtítulo, ações (ex.: + Novo)
2. **`CampaignDetailFiltersPanel`** — toggle mostrar/ocultar filtros **logo abaixo do subtítulo**
3. **`CampaignDrilldownHeader`** `variant="toolbar"` — só meta + período + refresh (sem repetir título)
4. **`CampaignDetailTabs`**
5. Tabela / grid

## Componentes

| Componente | Uso |
|------------|-----|
| `CampaignDrilldownHeader` | Cabeçalho da campanha com metadados estruturados |
| `CampaignDetailFiltersPanel` | Painel colapsável de filtros (`FilterToggleButton`) |
| `CampaignDetailTabs` | Navegação Visão geral / Conjuntos / Anúncios / Criativos |
| `Badge variant="accent"` | Status **Pausada** — roxo no dark, âmbar no light |
| `Badge variant="success"` | Status **Ativa** |

## Classes CSS

```css
.ui-breadcrumb              /* breadcrumb com espaçamento */
.ui-campaign-meta-pill      /* pills coloridas (violet, blue, amber, emerald, slate) */
.ui-kpi-card                /* cards de KPI com borda */
.ui-alert-info              /* resumo / alertas temáticos */
.ds-scroll                  /* scrollbar fina com cor --ui-accent */
```

## Header — layout

- **Sem container com fundo** — header flat sobre o fundo da página
- **Linha superior (overview):** título + badge à esquerda; `Mostrar filtros` + `Atualizar da Meta` à direita
- **Pills** logo abaixo: Cliente (violet), ID (slate), Conta (blue), Objetivo (amber), Orçamento (emerald)
- **Período:** oculto por padrão; aparece ao clicar em Mostrar filtros

## Refresh da Meta

No header da campanha, o botão **"Atualizar da Meta"** (`refreshLive`) deve:

- Chamar APIs da campanha com `?live=1` (métricas ao vivo **desta campanha**)
- **Não** disparar `POST /api/sync/run` (sync global do cliente)

Implementação: `drilldown.refresh({ live: true })` ou `reload()` com `live=1` nas rotas `/api/campaigns/[id]/*`.

## Ações da campanha

- **Não** usar dropdown "Ações" no header — duplica o card "Status da campanha" (Ativar, Editar orçamento, Duplicar, Ver na Meta).
- Ações ficam no card lateral da overview.

## Resumo de conjuntos (sidebar)

Usar `.ui-alert-info` em vez de card neutro:

- Light: fundo/borda âmbar
- Dark: fundo/borda roxo

## Checklist para novas telas no drilldown

- [ ] Breadcrumb com `.ui-breadcrumb`
- [ ] Filtros com `CampaignDetailFiltersPanel` abaixo do subtítulo
- [ ] Header `variant="toolbar"` nas sub-abas
- [ ] Badge pausada = `accent`, ativa = `success`
- [ ] Scroll areas com `.ds-scroll`
- [ ] Refresh escopo campanha (`live=1`), não sync global
- [ ] Sem botão "Ações" redundante no header
