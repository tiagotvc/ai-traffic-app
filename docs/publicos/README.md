# Públicos (aba "Públicos" do sidebar)

> Rota(s): `/[locale]/audiences` — arquivo [src/app/[locale]/(app)/audiences/page.tsx](../../src/app/[locale]/(app)/audiences/page.tsx)
> Fonte de verdade desta feature. Atualize este doc a cada incremento/decremento.
>
> 📎 **Regras da Meta (formato, restrições `#2654`, fixes):** ver [meta-custom-audience-rules.md](./meta-custom-audience-rules.md).

## Visão geral

A aba "Públicos" lista, cria e gerencia públicos da Meta (Custom/Lookalike/Saved Audiences) sem sair do Orion. Os públicos são **sincronizados diretamente da Meta** (Graph API) por conta de anúncios, com cache de 30 minutos no banco. A tela permite:

- Selecionar **cliente** e **conta de anúncios** e listar os públicos daquela conta.
- Filtrar por abas: **Públicos salvos**, **Excluídos** (os marcados como exclusão padrão do cliente) e **Templates** (templates de campanha por cliente).
- Buscar por nome/subtipo/fonte e paginar (10 por página).
- Ver **detalhes** de um público (tamanho estimado, status de entrega/operação, datas, regra) num modal que busca o detalhe na Meta sob demanda.
- **Incluir/remover** um público do "targeting padrão" do cliente (`defaultCustomAudienceIds`), para pré-seleção em novas campanhas.
- Criar novos públicos via um **wizard de 4 etapas** (Tipo → Detalhes → Regras → Revisão): Personalizado (engajamento/site-Pixel), Lookalike (semelhante) e Salvo (segmentação manual).
- Acompanhar os **lookalikes recentes** (jobs) no rodapé da lista.

## Arquitetura / fluxo de arquivos

| Camada | Arquivo |
| --- | --- |
| Página (rota) | [src/app/[locale]/(app)/audiences/page.tsx](../../src/app/[locale]/(app)/audiences/page.tsx) |
| Adapter de view | [src/uxpilot-ui/adapters/AudiencesView.tsx](../../src/uxpilot-ui/adapters/AudiencesView.tsx) |
| Componente principal (cliente) | [src/components/AudiencesLookalikeClient.tsx](../../src/components/AudiencesLookalikeClient.tsx) |
| Wizard de criação (ativo) | [src/uxpilot-ui/adapters/AudienceCreatorUxPage.tsx](../../src/uxpilot-ui/adapters/AudienceCreatorUxPage.tsx) |
| Modal de detalhes | [src/components/audiences/AudienceDetailModal.tsx](../../src/components/audiences/AudienceDetailModal.tsx) |
| Banner de aceite de termos (ToS) | [src/components/audiences/create/TosBanner.tsx](../../src/components/audiences/create/TosBanner.tsx) |
| Tipos compartilhados | [src/components/audiences/create/types.ts](../../src/components/audiences/create/types.ts) |
| API — hub (lista + contexto) | [src/app/api/audiences/hub/route.ts](../../src/app/api/audiences/hub/route.ts) |
| API — listar públicos de uma conta | [src/app/api/meta/audiences/route.ts](../../src/app/api/meta/audiences/route.ts) |
| API — detalhe de um público | [src/app/api/meta/audiences/[audienceId]/route.ts](../../src/app/api/meta/audiences/[audienceId]/route.ts) |
| API — opções de criação | [src/app/api/meta/audience-creation/options/route.ts](../../src/app/api/meta/audience-creation/options/route.ts) |
| API — criar público de site (Pixel) | [src/app/api/meta/audiences/website/route.ts](../../src/app/api/meta/audiences/website/route.ts) |
| API — criar público de engajamento | [src/app/api/meta/audiences/engagement/route.ts](../../src/app/api/meta/audiences/engagement/route.ts) |
| API — combinar públicos | [src/app/api/meta/audiences/combine/route.ts](../../src/app/api/meta/audiences/combine/route.ts) |
| API — criar público salvo (saved) | [src/app/api/meta/saved-audiences/route.ts](../../src/app/api/meta/saved-audiences/route.ts) |
| API — criar lookalikes em lote | [src/app/api/clients/[clientId]/lookalike/batch/route.ts](../../src/app/api/clients/[clientId]/lookalike/batch/route.ts) |
| API — settings do cliente (targeting padrão) | `src/app/api/clients/[clientId]/meta-settings/route.ts` (PATCH `defaultCustomAudienceIds`) |
| Lib — Graph (fetch públicos) | [src/lib/meta-graph.ts](../../src/lib/meta-graph.ts) (`fetchCustomAudiences`, `fetchCustomAudienceDetail`) |
| Lib — criação de públicos | [src/lib/meta-audience-create.ts](../../src/lib/meta-audience-create.ts) |
| Lib — helpers/validação/ToS | [src/lib/audience-api-helpers.ts](../../src/lib/audience-api-helpers.ts) |
| Lib — resumo legível da regra | [src/lib/meta-audience-rule-summary.ts](../../src/lib/meta-audience-rule-summary.ts) |
| Entity — cache de públicos | [src/db/entities/MetaAudienceCache.ts](../../src/db/entities/MetaAudienceCache.ts) |
| Entity — jobs de lookalike | [src/db/entities/LookalikeJob.ts](../../src/db/entities/LookalikeJob.ts) |
| Gating (sidebar/plano) | [src/lib/billing/nav-permissions.ts](../../src/lib/billing/nav-permissions.ts), [src/components/layout/AppSidebar.tsx](../../src/components/layout/AppSidebar.tsx) |

Fluxo: `page.tsx` → `AudiencesView` (envolve em `UxPageMain`) → `AudiencesLookalikeClient` com `useUxChrome`. O client carrega o contexto via `/api/audiences/hub`, depois carrega os públicos da conta selecionada via `/api/audiences/hub?clientId=...&adAccountId=...`. A criação abre `AudienceCreatorUxPage` inline (troca `view` de `"list"` para `"create"`).

## Elementos da tela / componentes

### `AudiencesLookalikeClient` — [src/components/AudiencesLookalikeClient.tsx](../../src/components/AudiencesLookalikeClient.tsx)
- **Props:** `{ useUxChrome?: boolean }` (a rota passa `true`, que ativa `PageToolbar` + integração com o command strip da página).
- **Comportamento:**
  - Estados de seleção: `clientSlug`, `adAccountId`, `listTab` (`saved` | `excluded` | `templates`), `search`, `page` (paginação, `PAGE_SIZE = 10`), `view` (`list` | `create`).
  - `loadContext()` chama `/api/audiences/hub` (clientes, jobs de lookalike, templateGroups, `metaConnected`); `loadAudiences(refresh?)` chama o mesmo hub com `clientId`/`adAccountId` (e `refresh=1` ao forçar atualização).
  - Contas de anúncios do cliente vêm de `/api/meta/ad-accounts?clientId=...`; default = `client.defaultAdAccountId` ou primeira da lista.
  - `filteredAudiences` aplica filtro de aba "excluded" (via `client.defaultExcludedAudienceIds`) e busca por nome/sourceLabel/subtype.
  - `toggleAttach(id, attach)` faz `PATCH /api/clients/{slug}/meta-settings` atualizando `defaultCustomAudienceIds` (botão "Incluir/Remover do targeting padrão").
  - Renderiza badges por `kind` (lookalike/engagement/app/custom), tamanho aproximado/ratio, e botões "Ver detalhes" e attach.
  - Integra com `useCommandStripPage({ hideFilters: true, hideSync: true })` e sincroniza filtros de cliente/conta com o command strip quando `useUxChrome`.
  - Mostra alerta "Conecte a conta Meta" quando `!metaConnected`; banner informativo (`AudienceListInfoBanner`) nas abas não-templates.

### `AudienceCreatorUxPage` (wizard ativo) — [src/uxpilot-ui/adapters/AudienceCreatorUxPage.tsx](../../src/uxpilot-ui/adapters/AudienceCreatorUxPage.tsx)
- **Props:** `{ ctx: AudienceCreateContext; clients: {slug,name}[]; clientSlug; onClientChange; onBack }`.
- **Comportamento:** wizard de 4 etapas (`type` → `details` → `rules` → `review`) com 3 tipos de público:
  - **custom**: fonte `instagram`/`facebook`/`site` → `POST /api/meta/audiences/engagement` (IG/FB) ou `POST /api/meta/audiences/website` (Pixel). Carrega ativos via `/api/meta/audience-creation/options`. A lista de **ações do passo "Regras" é dinâmica por fonte** (site → eventos de Pixel; IG/FB → ações de engajamento), derivada do catálogo de `options` — ver [meta-custom-audience-rules.md §6](./meta-custom-audience-rules.md). ⚠️ **Instagram não é criável via API** (subtipo `IG_BUSINESS` bloqueado pela Meta) — ver §5 do mesmo doc.
  - **lookalike**: escolhe público-semente + percentual (1/2/3/5/10%) + país → `POST /api/clients/{slug}/lookalike/batch`.
  - **saved**: faixa etária, gêneros, país (interesses são apenas exibidos) → `POST /api/meta/saved-audiences`.
  - Mostra `TosBanner` (bloqueia o botão "Criar" se o ToS de públicos não estiver aceito), painel lateral de "Completude" (score) e prévia. Em sucesso chama `ctx.onRefresh()` e volta à lista.

### `AudienceDetailModal` — [src/components/audiences/AudienceDetailModal.tsx](../../src/components/audiences/AudienceDetailModal.tsx)
- **Props:** `{ open; onClose; summary: SavedAudienceSummary | null; clientSlug; adAccountId }`.
- **Comportamento:** ao abrir, busca `GET /api/meta/audiences/{id}?clientId=...&adAccountId=...` e exibe ID, subtipo, cliente, país, tamanho estimado, status de entrega/operação, datas de criação/atualização e resumo da regra (`summarizeAudienceRule`).

### Componentes auxiliares
- `AudienceListInfoBanner` (local em `AudiencesLookalikeClient`): banner âmbar informativo.
- `TosBanner` — [src/components/audiences/create/TosBanner.tsx](../../src/components/audiences/create/TosBanner.tsx): verifica/avisa sobre aceite dos termos de Custom Audiences.

### Componentes legados (NÃO usados pela rota atual)
Existem wizards alternativos em `src/components/audiences/create/` — [CreateAudienceHub.tsx](../../src/components/audiences/create/CreateAudienceHub.tsx), [EngagementAudienceWizard.tsx](../../src/components/audiences/create/EngagementAudienceWizard.tsx), [LookalikeAudienceWizard.tsx](../../src/components/audiences/create/LookalikeAudienceWizard.tsx), [WebsiteAudienceWizard.tsx](../../src/components/audiences/create/WebsiteAudienceWizard.tsx), [SavedCombineWizards.tsx](../../src/components/audiences/create/SavedCombineWizards.tsx), [AiAudienceWizard.tsx](../../src/components/audiences/create/AiAudienceWizard.tsx) e [ReadOnlyPanels.tsx](../../src/components/audiences/create/ReadOnlyPanels.tsx). A rota atual usa apenas `AudienceCreatorUxPage`; esses componentes referenciam-se entre si mas não são importados pela página `audiences`. Confirmar se devem ser removidos ou se há outro ponto de entrada.

## Dados, estado e API

Não há hook dedicado — o estado vive no componente cliente `AudiencesLookalikeClient` (via `useState`/`useEffect`/`useTransition`) e no wizard `AudienceCreatorUxPage`. Internacionalização via `useTranslations("audiences")`.

**Endpoints usados:**

| Método/Endpoint | Uso |
| --- | --- |
| `GET /api/audiences/hub` | Contexto: clientes, contas, jobs de lookalike, templateGroups, `metaConnected`. Com `clientId`+`adAccountId` retorna `savedAudiences` (sincronizando da Meta com cache de 30 min). Valida que a conta está vinculada ao workspace/cliente (403 caso contrário). |
| `GET /api/meta/audiences?adAccountId=` | Lista crua de Custom Audiences da conta (com cache). |
| `GET /api/meta/audiences/[audienceId]` | Detalhe de um público (usado pelo modal). |
| `GET /api/meta/audience-creation/options` | Pixels, páginas, contas IG, eventos, fontes/ações de engajamento, vídeos, lead forms. |
| `POST /api/meta/audiences/website` | Cria Custom Audience de site (Pixel). Valida ToS e vínculo cliente/conta. |
| `POST /api/meta/audiences/engagement` | Cria Custom Audience de engajamento (página/IG/vídeo/lead). |
| `POST /api/meta/audiences/combine` | Cria público combinado (include/exclude). |
| `POST /api/meta/saved-audiences` | Cria Saved Audience (targeting demográfico/geo). |
| `POST /api/clients/[clientId]/lookalike/batch` | Cria lookalikes em lote (1–50 itens); grava `LookalikeJob` e adiciona IDs a `defaultCustomAudienceIds`. |
| `PATCH /api/clients/[clientId]/meta-settings` | Atualiza `defaultCustomAudienceIds` (attach/detach targeting padrão). |
| `GET /api/meta/ad-accounts?clientId=` | Contas de anúncios do cliente. |

**Entities/modelos:**
- [MetaAudienceCache](../../src/db/entities/MetaAudienceCache.ts) — cache por `metaAdAccountId` (`audiences` jsonb + `fetchedAt`), TTL de 30 min.
- [LookalikeJob](../../src/db/entities/LookalikeJob.ts) — `clientId`, `metaAdAccountId`, `name`, `status` (pending/processing/ready/failed), `seedType`/`seedId`, `ratio`, `country`, `metaAudienceId`, `lastError`.
- `SavedAudienceSummary` / `AudienceCreateContext` / `AudienceOptions` — tipos em [types.ts](../../src/components/audiences/create/types.ts).
- Públicos em si não são persistidos no Orion (são da Meta); apenas cache, jobs e referências em `clientMetaSettings` (`defaultCustomAudienceIds`, `defaultExcludedAudienceIds`).

## Permissões / gating

Audiences é **gated por plano**. Ver [src/lib/billing/nav-permissions.ts](../../src/lib/billing/nav-permissions.ts):
- `GatedNavId` inclui `"audiences"`, mapeado para a chave de limite `allowNavAudiences` (`NAV_LIMIT_KEY`) e href `/audiences` (`NAV_HREF`).
- `isNavItemAllowed("audiences", limits)` retorna `true` somente se `limits.allowNavAudiences` for verdadeiro.
- O item do sidebar é definido com `gate: "audiences"` em [src/components/layout/AppSidebar.tsx](../../src/components/layout/AppSidebar.tsx) (linha ~93).
- Quando bloqueado, a UI exibe a mensagem `nav.locked.audiences` ("Públicos não estão incluídos no seu plano atual." — ver `messages/pt-BR.json`).
- Gating adicional em runtime: todas as rotas de criação exigem Meta conectada (`metaAccessToken`), vínculo cliente↔conta (`validateClientAdAccount`) e aceite do ToS de Custom Audiences (`checkCustomAudienceTos`).

## i18n

- Namespace: **`audiences`** (usado em `AudiencesLookalikeClient`, `AudienceCreatorUxPage`, `AudienceDetailModal`, `CreateAudienceHub`).
- Arquivos: [messages/pt-BR.json](../../messages/pt-BR.json) (bloco `"audiences"`, a partir da linha ~2741) e [messages/en.json](../../messages/en.json).
- Rótulo do item de sidebar: chave `audiences` no namespace de navegação; mensagem de bloqueio em `nav.locked.audiences`.
- Observação: parte dos textos do wizard `AudienceCreatorUxPage` (passos, títulos, descrições) está **hardcoded em português** no componente, não via i18n.

## Pendências / observações

- ⚠️ **Instagram (engajamento) não é criável via Marketing API** — o subtipo `IG_BUSINESS` só pode ser criado pelo Gerenciador de Anúncios/Audience Manager. A fonte "Instagram" no wizard tende a falhar com `#2654` (mensagem enganosa "Invalid Event Name"). Decisão pendente: remover a fonte "Instagram" do wizard ou exibir aviso de "criar no Gerenciador". Detalhes em [meta-custom-audience-rules.md §5](./meta-custom-audience-rules.md).
- **Textos hardcoded** no wizard `AudienceCreatorUxPage` (labels de etapas, países, ações, dicas) — migrar para o namespace `audiences`. (O refactor de design-system reverteu parte da migração i18n deste componente.)
- **Componentes legados** em `src/components/audiences/create/` (wizards, `CreateAudienceHub`, `AiAudienceWizard`, `ReadOnlyPanels`) não são usados pela rota atual — avaliar remoção ou reuso. O removido `AiWidgetBuilderModal`/wizards antigos sugerem migração em andamento para o `AudienceCreatorUxPage`.
- No wizard saved, o campo **"Interesses"** é coletado mas não enviado ao endpoint (`targeting` envia apenas geo/idade/gênero).
- Criação de **custom (engagement/website)** usa o primeiro ativo disponível (`options?.pages?.[0]`, `pixels?.[0]`, etc.) — não há seleção explícita de página/Pixel/conta IG na UI do `AudienceCreatorUxPage`.
- A aba **"Excluídos"** filtra pelos `defaultExcludedAudienceIds` do cliente, mas a UI não oferece ação para marcar/desmarcar exclusão (apenas inclusão via attach).
- Cache de públicos: TTL fixo de **30 min**; usar "Atualizar da Meta" para forçar `refresh=1`.

## Histórico de mudanças relevantes
- 2026-06-24: Criação da documentação.
- 2026-06-28: Correções no fluxo de criação de públicos da Meta (ver [meta-custom-audience-rules.md](./meta-custom-audience-rules.md)):
  - Removido `subtype` na criação de site/engajamento (descontinuado na API v3+; erro `#2654`/`1870053`). Mantido só para `VIDEO`.
  - Adicionado `sanitizeMetaEventName` (≤49 chars, `[A-Za-z0-9_]`) nos builders de regra e na rota de opções — corrige `#2654`/`1713151` com conversões personalizadas.
  - Removidos tokens inexistentes do catálogo: `page_liked` e `ig_user_followed_business`.
  - `AudienceCreatorUxPage`: ações do passo "Regras" agora **dinâmicas por fonte** (antes era lista fixa); `handleCreate` envia o evento real selecionado (removido `eventMap` lossy).
  - Documentada a limitação: **públicos de engajamento de Instagram não são criáveis via API**.
  - Regra de **site (Pixel)** migrada do formato legado `event: { event_name }` para o flexible spec (`filter`/`field:"event"`/`operator:"eq"`) — corrige `#100`/`1713098` "Invalid rule JSON format".
