# Clientes (aba "Clientes" do sidebar)

> Rota(s): `/[locale]/clients`, `/clients/new`, `/clients/[clientId]`, `/clients/[clientId]/settings`, `/clients/[clientId]/suggestions` (redirect), `/clients/[clientId]/agency-brain` (redirect), `/clients/[clientId]/campaigns/[metaCampaignId]` (redirect).
>
> Fonte de verdade desta feature. Atualize este doc a cada incremento/decremento.

## Visão geral

A feature "Clientes" é o hub onde a agência centraliza cada cliente Meta (Facebook/Instagram): vincula Business Manager (BM) e contas de anúncio, define metas/limites de KPI, configura os ativos de publicação (página, URL, pixel, etc.) e acompanha a performance agregada do cliente.

São três telas próprias e três redirects:

- **Lista de clientes** (`/clients`): cards com KPIs por cliente, busca, criação e exclusão.
- **Criar cliente** (`/clients/new`): wizard de 3 passos (nome → BM → contas de anúncio).
- **Visão geral do cliente** (`/clients/[clientId]`): KPIs adaptados ao tipo dominante de campanha, gráfico de performance e tabela de campanhas ativas.
- **Configurações do cliente** (`/clients/[clientId]/settings`): metas, ativos de publicação, BM/contas, nicho, extras Meta e zona de exclusão.
- As subrotas `/suggestions`, `/agency-brain` e `/campaigns/[metaCampaignId]` apenas redirecionam para as features globais correspondentes (Agency Brain / Campanhas), preservando o cliente via query string.

O identificador usado na URL (`clientId`) é, na prática, o **slug** derivado do nome (`slugify`), não o UUID. As rotas de API resolvem por slug ou id via `getClientBySlugOrId`.

## Arquitetura / fluxo de arquivos

| Camada | Arquivo |
| --- | --- |
| Página (lista) | [src/app/[locale]/(app)/clients/page.tsx](src/app/[locale]/(app)/clients/page.tsx) |
| Página (criar) | [src/app/[locale]/(app)/clients/new/page.tsx](src/app/[locale]/(app)/clients/new/page.tsx) |
| Página (visão geral) | [src/app/[locale]/(app)/clients/[clientId]/page.tsx](src/app/[locale]/(app)/clients/[clientId]/page.tsx) |
| Página (configurações) | [src/app/[locale]/(app)/clients/[clientId]/settings/page.tsx](src/app/[locale]/(app)/clients/[clientId]/settings/page.tsx) |
| Redirect (sugestões) | [src/app/[locale]/(app)/clients/[clientId]/suggestions/page.tsx](src/app/[locale]/(app)/clients/[clientId]/suggestions/page.tsx) |
| Redirect (agency brain) | [src/app/[locale]/(app)/clients/[clientId]/agency-brain/page.tsx](src/app/[locale]/(app)/clients/[clientId]/agency-brain/page.tsx) |
| Redirect (campanha) | [src/app/[locale]/(app)/clients/[clientId]/campaigns/[metaCampaignId]/page.tsx](src/app/[locale]/(app)/clients/[clientId]/campaigns/[metaCampaignId]/page.tsx) |
| View (lista) | [src/uxpilot-ui/adapters/ClientsView.tsx](src/uxpilot-ui/adapters/ClientsView.tsx) → [ClientsContentLive.tsx](src/uxpilot-ui/adapters/ClientsContentLive.tsx) |
| View (criar) | [src/uxpilot-ui/adapters/ClientsCreateView.tsx](src/uxpilot-ui/adapters/ClientsCreateView.tsx) → [ClientsCreateContentLive.tsx](src/uxpilot-ui/adapters/ClientsCreateContentLive.tsx) |
| Componente (visão geral) | [src/components/ClientOverviewClient.tsx](src/components/ClientOverviewClient.tsx) |
| Componente (configurações) | [src/components/ClientDetailClient.tsx](src/components/ClientDetailClient.tsx) |
| Tabs internas | [src/components/client/ClientDetailTabs.tsx](src/components/client/ClientDetailTabs.tsx) |
| Sub-componentes (settings) | [src/components/ClientReadinessChecklist.tsx](src/components/ClientReadinessChecklist.tsx), [src/components/ClientMetaExtras.tsx](src/components/ClientMetaExtras.tsx) |
| Hook (lista) | [src/uxpilot-ui/adapters/useClientsData.ts](src/uxpilot-ui/adapters/useClientsData.ts) |
| Hook (wizard) | [src/uxpilot-ui/adapters/useCreateClientWizard.ts](src/uxpilot-ui/adapters/useCreateClientWizard.ts) |
| Mapper (cards) | [src/uxpilot-ui/adapters/clients-mappers.ts](src/uxpilot-ui/adapters/clients-mappers.ts) |
| Lib (cards no servidor) | [src/lib/clients-list.ts](src/lib/clients-list.ts) |
| Lib (vínculos Meta) | [src/lib/link-client-meta.ts](src/lib/link-client-meta.ts) |
| Lib (settings Meta) | [src/lib/client-meta-settings.ts](src/lib/client-meta-settings.ts) |
| Entidade | [src/db/entities/Client.ts](src/db/entities/Client.ts) |

## Telas e subrotas

- `/clients` -> Hub: grade de cards (2 colunas em desktop) com inicial/cor do cliente, status (Saudável / N alertas), KPIs (Investimento, ROAS, custo/CPL), nº de contas conectadas, busca por nome/slug e botão "+" para criar. Clicar num card seleciona e abre a barra de ações flutuante (Ver cliente / Editar / Excluir). O título e o link levam para `/clients/[slug]`.
- `/clients/new` -> Wizard de criação em 3 passos: (1) Nome do cliente; (2) escolher Business Manager; (3) selecionar contas de anúncio (com gasto dos últimos 30 dias). Painéis laterais mostram etapas, progresso (score), prévia do cliente e completude. Ao concluir, volta para `/clients`.
- `/clients/[clientId]` -> Visão geral: header com breadcrumb, tabs (Visão geral / Configurações), 3 KPIs "hero" adaptados ao preset dominante das campanhas, gráfico de performance multi-métrica (recharts) com seletor rápido de métricas + modal "ver mais", e tabela de campanhas **ativas** com toggle de status, seletor de tipo/preset e colunas configuráveis.
- `/clients/[clientId]/settings` -> Configurações: onboarding dispensável, checklist de prontidão, card de KPIs + ações (ver campanhas / excluir), metas/limites de KPI, ativos de publicação (página Meta + URL de destino), extras Meta ([ClientMetaExtras](src/components/ClientMetaExtras.tsx)), nicho (Agency Brain), vínculo de BM/contas e zona de exclusão. Aside com atalho para o Action Center.
- `/clients/[clientId]/suggestions` -> redireciona para `/agency-brain/suggestions?client=<clientId>`.
- `/clients/[clientId]/agency-brain` -> redireciona para `/agency-brain/learnings?client=<clientId>`.
- `/clients/[clientId]/campaigns/[metaCampaignId]` -> redireciona para `/campaigns/<metaCampaignId>?client=<clientId>`.

## Elementos / componentes principais

### [ClientsContentLive](src/uxpilot-ui/adapters/ClientsContentLive.tsx)
- Props: nenhuma. Consome [useClientsData](src/uxpilot-ui/adapters/useClientsData.ts) e [toUxClientCards](src/uxpilot-ui/adapters/clients-mappers.ts).
- Comportamento: renderiza [PageToolbar](src/components/layout/PageToolbar.tsx) (título, contagem, busca, botão Novo Cliente), grade de cards com skeleton de loading e estado vazio, e [UxFloatingActionBar](src/uxpilot-ui/adapters/UxFloatingActionBar.tsx) com ações sobre o cliente selecionado. Esconde filtros globais e sync (`useCommandStripPage({ hideFilters, hideSync })`). `StatusPill` interno mostra "Saudável" ou "N alerta(s)".

### [ClientsCreateContentLive](src/uxpilot-ui/adapters/ClientsCreateContentLive.tsx)
- Props: nenhuma. Consome [useCreateClientWizard](src/uxpilot-ui/adapters/useCreateClientWizard.ts) e primitivas de [ux-wizard-primitives](src/uxpilot-ui/adapters/ux-wizard-primitives.tsx).
- Comportamento: wizard de 3 passos com validação por passo (`canContinueStep1/2`), busca de BM e de contas, seleção múltipla de contas, alerta de inventário vazio (link para `/settings/meta-assets`) e botão "Criar" (chama `w.create`).

### [ClientOverviewClient](src/components/ClientOverviewClient.tsx)
- Props: `{ clientId: string }`.
- Comportamento: define o filtro de cliente na command strip (`strip.setClientFilter`); carrega summary/timeseries do dashboard + campanhas ativas do command center, com refresh automático ao evento `traffic-sync-done`. KPIs e tabela de métricas adaptam-se ao preset dominante. Permite alternar status de campanha, trocar preset por campanha e persistir métricas de gráfico por cliente (PATCH em `meta-settings.defaultDashboardMetrics`, com fallback para a preferência do usuário). Usa [MetricPickerModal](src/components/MetricPickerModal.tsx), [CampaignTableColumnsButton](src/components/CampaignTableColumnsButton.tsx) e colunas de [campaign-table-metrics](src/lib/campaign-table-metrics.ts).

### [ClientDetailClient](src/components/ClientDetailClient.tsx)
- Props: `{ clientId: string }`.
- Comportamento: tela de configurações. Carrega `GET /api/clients/:id`, `/goals`, `/ad-accounts` e `/meta-settings`. Salva metas (PATCH `/goals`), publicação página+URL (PATCH `/meta-settings`), nicho (PATCH `/context`) e vínculo de BM/contas (PATCH `/ad-accounts`). Exclui cliente (DELETE `/api/clients/:id`) com proteção do cliente "Default". Filtra contas/páginas por BM efetiva. Inclui sub-helpers `Kpi`, `GoalField`, `UxSaveButton`.

### [ClientDetailTabs](src/components/client/ClientDetailTabs.tsx)
- Props: `{ clientSlug: string; activeTab: "overview" | "settings" }`. Helper `clientTabHref(tab, slug)`.
- Comportamento: navegação entre Visão geral e Configurações. (Usa o namespace `agencyBrain` para os labels das tabs.)

### [ClientReadinessChecklist](src/components/ClientReadinessChecklist.tsx)
- Props: `{ clientId: string }`.
- Comportamento: agrega `ad-accounts`, `meta-settings` e `/api/sync/status` para mostrar checklist (BM, contas, página, URL, pixel, sync) com contagem concluída.

### [ClientMetaExtras](src/components/ClientMetaExtras.tsx)
- Props: `{ clientId: string; defaultAdAccountId: string }`.
- Comportamento: configura extras Meta do cliente — pixel, lead form, Instagram actor, CTA padrão, sync (on/off + prioridade), automação, tags, públicos default, UTMs padrão e endereço comercial (geocodificado). Persiste via PATCH `/meta-settings`.

## Dados, estado e API

### Hooks
- [useClientsData](src/uxpilot-ui/adapters/useClientsData.ts): carrega `GET /api/clients?period=thisWeek`, mantém busca local, recarrega em `traffic-sync-done` / `traffic:campaigns-reload`, e expõe `deleteClient`/`deleteClients` (via bulk-delete) com proteção do cliente "Default".
- [useCreateClientWizard](src/uxpilot-ui/adapters/useCreateClientWizard.ts): estado do wizard; carrega `GET /api/meta/businesses` e `GET /api/meta/account-options`; `create()` faz `POST /api/clients`.

### Endpoints em `src/app/api/clients/**` usados por esta feature
- [GET/POST /api/clients](src/app/api/clients/route.ts) — lista cards (cacheado em Redis 60s; suporta `?minimal=1` e `?period=`) via [buildClientListCards](src/lib/clients-list.ts); cria cliente (valida limite `maxClients`, cria meta padrão, vincula BM/contas).
- [GET/DELETE /api/clients/[clientId]](src/app/api/clients/[clientId]/route.ts) — detalhe agregado (KPIs, contas, campanhas com alertas) e exclusão (bloqueia "Default").
- [POST /api/clients/bulk-delete](src/app/api/clients/bulk-delete/route.ts) — exclusão em lote (máx. 50; pula "Default").
- [GET/PATCH /api/clients/[clientId]/ad-accounts](src/app/api/clients/[clientId]/ad-accounts/route.ts) — contas disponíveis/vinculadas + BM do cliente; vincula contas.
- [GET/PATCH /api/clients/[clientId]/goals](src/app/api/clients/[clientId]/goals/route.ts) — metas/limites de KPI ([ClientGoal](src/db/entities/ClientGoal.ts)).
- [GET/PATCH /api/clients/[clientId]/meta-settings](src/app/api/clients/[clientId]/meta-settings/route.ts) — ativos/preferências Meta de publicação e dashboard ([ClientMetaSettings](src/db/entities/ClientMetaSettings.ts)), páginas disponíveis, prontidão de publicação, tags.
- [GET/PATCH /api/clients/[clientId]/context](src/app/api/clients/[clientId]/context/route.ts) — `aiContext`, nicho, país de mercado e concorrentes (Agency Brain).

Endpoints adicionais sob `/api/clients/[clientId]/**` (learnings, hypotheses, action-suggestions, dna, timeline, experiments, action-plans, brain-summary, lookalike, message-templates, publish-config) pertencem majoritariamente às features Agency Brain / publicação e são consumidos a partir daquelas telas, não diretamente pelas páginas de Clientes.

A visão geral também consome endpoints fora de `/api/clients`: `GET /api/dashboard/summary`, `GET /api/dashboard/timeseries`, `GET /api/command-center/campaigns`, `GET/POST /api/campaign-presets`, `POST /api/campaigns/:id/actions` e `GET /api/settings/dashboard-prefs`.

### Entidades / modelos
- [Client](src/db/entities/Client.ts): `name`, `tenantId`, `aiContext`, `metaPageId`, `metaLinkUrl`, `metaBusinessId`, `googleAdsCustomerId`, `niche`, `marketCountry`, `competitors`. Relação `ManyToOne` com `Tenant` (`onDelete: CASCADE`).
- [ClientGoal](src/db/entities/ClientGoal.ts): metas/limites de KPI por cliente.
- [ClientMetaSettings](src/db/entities/ClientMetaSettings.ts): preferências de publicação e dashboard.
- [AdAccount](src/db/entities/AdAccount.ts): contas de anúncio vinculadas (via `clientId`).
- [ClientTag](src/db/entities/ClientTag.ts): tags do cliente.
- Tipos auxiliares: `ClientRow`/`UxClientCard` (mappers) e `ClientListCard` ([clients-list.ts](src/lib/clients-list.ts)).

## Permissões / gating

- A **criação** de cliente é limitada pelo plano: `POST /api/clients` chama `assertLimit(tenant.id, "maxClients")` ([entitlements.ts](src/lib/billing/entitlements.ts)). Ao estourar, retorna erro de billing via [billing/api-errors](src/lib/billing/api-errors.ts) (o wizard exibe a mensagem de erro).
- Limites `maxClients` por plano em [src/lib/billing/types.ts](src/lib/billing/types.ts): Free 2, planos intermediários 3 / 10 / 50, e ilimitado (`-1`) no topo. Add-ons podem somar `extraClients` ([tenant-addons.ts](src/lib/billing/tenant-addons.ts)). Platform admin tem limites do `PLATFORM_ADMIN_LIMITS`.
- Clientes "demo" e o cliente de sistema "Default" são tratados à parte na contagem de uso ([entitlements.ts](src/lib/billing/entitlements.ts) `getTenantUsage`) e o "Default" é protegido contra exclusão na UI e na API.
- Não há gating por plano para *visualizar* a lista/visão geral de clientes; as telas dependentes (Agency Brain, etc.) aplicam seus próprios gatings.

## i18n

- Namespace principal da lista e do wizard: **`clientsHub`** (e sub-objeto `clientsHub.createWizard`).
- Visão geral: **`clientOverview`** (mais `metrics`, `campaignTypes`, `campaignsPage` para tabela/colunas).
- Configurações e sub-componentes (checklist, extras): **`client`**.
- Tabs internas (Visão geral / Configurações): namespace **`agencyBrain`** (`tabOverview` / `tabSettings`).
- Arquivos: [messages/pt-BR.json](messages/pt-BR.json) e [messages/en.json](messages/en.json).

## Pendências / observações

- O `clientId` na URL é o slug do nome; renomear um cliente muda o slug e, portanto, as URLs.
- A lista usa `period=thisWeek` fixo no hook; já o detalhe respeita o período da command strip.
- A barra de ações flutuante da lista exclui um cliente por vez via `bulk-delete` (o i18n já prevê seleção múltipla/`bulkDelete`, mas a UI atual seleciona um card por vez).
- `googleAdsCustomerId` existe na entidade como integração futura, sem UI ativa nesta feature.
- A cor do card é apenas estética (índice da paleta `CARD_COLORS`), não persistida.

## Histórico de mudanças relevantes

- 2026-06-24: Criação da documentação.
</content>
</invoke>
