# Cérebro da agência (grupo "Cérebro da agência" do sidebar — Beta)

> **Rota(s):**
> - [`/agency-brain`](../../src/app/[locale]/(app)/agency-brain/page.tsx) → redireciona para `/agency-brain/learnings`
> - [`/agency-brain/learnings`](../../src/app/[locale]/(app)/agency-brain/learnings/page.tsx) (+ [`/[learningId]`](../../src/app/[locale]/(app)/agency-brain/learnings/[learningId]/page.tsx))
> - [`/agency-brain/hypotheses`](../../src/app/[locale]/(app)/agency-brain/hypotheses/page.tsx) (+ [`/[hypothesisId]`](../../src/app/[locale]/(app)/agency-brain/hypotheses/[hypothesisId]/page.tsx))
> - [`/automations`](../../src/app/[locale]/(app)/automations/page.tsx) (subitem MVP do grupo, mas rota fora de `/agency-brain`)
> - Estendidos: [`/agency-brain/dna`](../../src/app/[locale]/(app)/agency-brain/dna/page.tsx), [`/agency-brain/suggestions`](../../src/app/[locale]/(app)/agency-brain/suggestions/page.tsx), [`/agency-brain/experiments`](../../src/app/[locale]/(app)/agency-brain/experiments/page.tsx), [`/agency-brain/timeline`](../../src/app/[locale]/(app)/agency-brain/timeline/page.tsx), [`/agency-brain/chat`](../../src/app/[locale]/(app)/agency-brain/chat/page.tsx), [`/agency-brain/action-plans`](../../src/app/[locale]/(app)/agency-brain/action-plans/page.tsx), [`/agency-brain/labs`](../../src/app/[locale]/(app)/agency-brain/labs/page.tsx)
>
> **Fonte de verdade desta feature. Atualize este doc a cada incremento/decremento.**

---

## Visão geral

O **Cérebro da agência** é a camada de inteligência/memória do Orion. Ele captura, organiza e
promove conhecimento sobre as contas de Meta Ads de cada cliente:

- **Aprendizados (learnings)** — fatos validados ("memória" da conta). Podem ser criados
  manualmente, por regras (`RULE`), por IA (`AI`) ou importados. Passam por um fluxo de
  curadoria: `SUGGESTED` → aprovar/rejeitar → `APPROVED`/`REJECTED`/`ARCHIVED`.
- **Hipóteses (hypotheses)** — suposições a testar; quando confirmadas podem ser **promovidas**
  a um aprendizado. Estados: `SUGGESTED → TESTING → CONFIRMED/REJECTED → PROMOTED`.
- **Automações (automations)** — regras condição→ação (ex.: pausar campanha / alertar / ajustar
  budget) por tenant/cliente. Vive em `/automations`, fora da árvore `/agency-brain`, mas aparece
  como subitem MVP do grupo no sidebar.

No sidebar o grupo aparece com o selo **Beta** e é renderizado por
[`AgencyBrainNavGroup`](../../src/components/layout/AgencyBrainNavGroup.tsx) (injetado pelo
[`AppSidebar`](../../src/components/layout/AppSidebar.tsx) logo após o item "creatives"). Em modo
expandido mostra **3 subitens MVP**: Aprendizados, Hipóteses e Automações.

Há ainda um conjunto de **módulos estendidos** (DNA, Sugestões/Action Center, Experimentos,
Linha do tempo, Chat, Planos de ação, Labs). Eles existem como rotas, mas **não aparecem na nav
MVP** (`mvpVisible: false`) e a maioria está atrás de feature flags e/ou marcada `comingSoon`.

> ⚠️ Existem **duas implementações** das telas de Aprendizados/Hipóteses no código:
> 1. **MVP atual (em uso nas rotas)** — `insights/BrainFeedPage` (feed unificado com abas
>    Aprendizados / Hipóteses / Logs), alimentado por dados mock (`useBrainInsights`).
> 2. **Versão "client-scoped" legada/alternativa** — `AgencyBrainContent` + `useAgencyBrain` e
>    `HypothesesContent`, que consomem as APIs reais por cliente (`/api/clients/[clientId]/...`).
>    Hoje essa versão **não está plugada nas rotas MVP** (as `page.tsx` de learnings/hypotheses
>    renderizam o `BrainFeedPage`), mas os componentes e endpoints continuam no repo.

---

## Arquitetura / fluxo de arquivos

| Camada | Arquivo |
|---|---|
| Nav (sidebar, grupo Beta) | [`src/components/layout/AgencyBrainNavGroup.tsx`](../../src/components/layout/AgencyBrainNavGroup.tsx) |
| Injeção no sidebar | [`src/components/layout/AppSidebar.tsx`](../../src/components/layout/AppSidebar.tsx) |
| Layout do grupo + gate de plano | [`src/app/[locale]/(app)/agency-brain/layout.tsx`](../../src/app/[locale]/(app)/agency-brain/layout.tsx) |
| Shell (cliente ativo, header, providers) | [`src/components/agency-brain/AgencyBrainShell.tsx`](../../src/components/agency-brain/AgencyBrainShell.tsx) |
| Contexto de cliente ativo | [`src/components/agency-brain/AgencyBrainClientContext.tsx`](../../src/components/agency-brain/AgencyBrainClientContext.tsx) |
| Contexto de status da IA | [`src/components/agency-brain/AgencyBrainAiContext.tsx`](../../src/components/agency-brain/AgencyBrainAiContext.tsx) |
| Redirect raiz | [`src/app/[locale]/(app)/agency-brain/page.tsx`](../../src/app/[locale]/(app)/agency-brain/page.tsx) |
| Página MVP Aprendizados/Hipóteses | [`src/components/agency-brain/insights/BrainFeedPage.tsx`](../../src/components/agency-brain/insights/BrainFeedPage.tsx) |
| Hook de dados do feed MVP (mock) | [`src/components/agency-brain/insights/useBrainInsights.ts`](../../src/components/agency-brain/insights/useBrainInsights.ts) |
| Conteúdo "client-scoped" (alternativo) | [`src/components/agency-brain/AgencyBrainContent.tsx`](../../src/components/agency-brain/AgencyBrainContent.tsx) |
| Hook de aprendizados por cliente | [`src/components/agency-brain/useAgencyBrain.ts`](../../src/components/agency-brain/useAgencyBrain.ts) |
| Hipóteses (versão por cliente) | [`src/components/agency-brain/HypothesesContent.tsx`](../../src/components/agency-brain/HypothesesContent.tsx) |
| Registro de módulos / flags | [`src/lib/agency-brain/domain/modules.ts`](../../src/lib/agency-brain/domain/modules.ts) |
| Gate de nav por plano | [`src/lib/billing/nav-permissions.ts`](../../src/lib/billing/nav-permissions.ts) |
| Tela "coming soon" | [`src/components/agency-brain/AgencyBrainComingSoon.tsx`](../../src/components/agency-brain/AgencyBrainComingSoon.tsx) |
| Gate de cliente p/ módulos estendidos | [`src/components/agency-brain/AgencyBrainClientGate.tsx`](../../src/components/agency-brain/AgencyBrainClientGate.tsx) |
| Serviços (domínio) | [`src/lib/agency-brain/`](../../src/lib/agency-brain/) (ex.: `client-learning-service.ts`, `hypothesis-service.ts`) |
| Entities | [`ClientLearning`](../../src/db/entities/ClientLearning.ts), [`ClientHypothesis`](../../src/db/entities/ClientHypothesis.ts), [`AutomationRule`](../../src/db/entities/AutomationRule.ts), [`ClientActionSuggestion`](../../src/db/entities/ClientActionSuggestion.ts) |

---

## Módulos e subrotas

Definidos em [`AGENCY_BRAIN_MODULE_REGISTRY`](../../src/lib/agency-brain/domain/modules.ts).
"MVP" = aparece no sidebar (`mvpVisible: true`). "Estendido" = rota existe, mas fora da nav MVP.

| Módulo | Rota | MVP/Estendido | Feature flag | O que faz |
|---|---|---|---|---|
| **Aprendizados** (`learnings`) | `/agency-brain/learnings` (+ `[learningId]`) | **MVP** (sempre visível) | — (só exige `allowCreativeMemoryAi` no grupo) | Feed de memória da conta; curadoria SUGGESTED→APPROVED. |
| **Hipóteses** (`hypotheses`) | `/agency-brain/hypotheses` (+ `[hypothesisId]`) | **MVP** | `allowAgencyBrainHypotheses` | Suposições a testar; promoção a aprendizado. |
| **Automações** (`automations`) | `/automations` | **MVP** (subitem do grupo) | `allowNavAutomations` (gate próprio da nav) | Regras condição→ação (pausar/alertar/ajustar budget). |
| DNA (`dna`) | `/agency-brain/dna` | Estendido | `allowAgencyBrainDna` | Padrões criativos / "DNA" do cliente. |
| Sugestões / Action Center (`suggestions`) | `/agency-brain/suggestions` | Estendido | — (sem flag própria) | Central de ações sugeridas (`ActionCenterContent`). |
| Planos de ação (`action-plans`) | `/agency-brain/action-plans` | Estendido (`comingSoon`) | `allowAgencyBrainActionPlans` | Tela "coming soon". |
| Linha do tempo (`timeline`) | `/agency-brain/timeline` | Estendido (`comingSoon`) | `allowAgencyBrainTimeline` | Tela "coming soon". |
| Experimentos (`experiments`) | `/agency-brain/experiments` | Estendido (não no registry) | — (gate via `AgencyBrainClientGate`) | `ExperimentsContent`. |
| Labs (`labs`) | `/agency-brain/labs` | Estendido (`comingSoon`, accent rosa) | `allowAgencyBrainExperiments` + `isLabsEnabledForUser` (platform admin) | Labs; ver [docs/labs](../labs/README.md). |
| Chat (`chat`) | `/agency-brain/chat` | Estendido (`comingSoon`) | `allowAgencyBrainChat` | Tela "coming soon". |

> Nota: `experiments` tem rota e componente, mas **não** está em `AGENCY_BRAIN_MODULE_REGISTRY`
> (o registry lista `labs` em vez disso). `suggestions` está no registry mas sem `featureFlag`.

---

## Elementos / componentes principais

### [`AgencyBrainNavGroup`](../../src/components/layout/AgencyBrainNavGroup.tsx)
- **Props:** `collapsed`, `agencyBrainFeatures: AgencyBrainFeatureFlags`, `pathname`,
  `permissionsReady?`, `isPlatformAdmin?`, `onNavigate?`.
- **Comportamento:** renderiza o item-pai "Cérebro da agência" com selo **Beta**. Se
  `allowCreativeMemoryAi` for falso → `AgencyBrainNavLocked` (link de upgrade). Quando expandido
  lista os subitens MVP de [`AGENCY_BRAIN_MVP_NAV_ITEMS`](../../src/lib/agency-brain/domain/modules.ts)
  (Aprendizados, Hipóteses) + Automações. Estado de expansão persiste em `localStorage`
  (`agency-brain-nav-expanded`); força-expandido quando a rota atual está sob `/agency-brain`.

### [`AgencyBrainShell`](../../src/components/agency-brain/AgencyBrainShell.tsx)
- **Props:** `children`.
- **Comportamento:** carrega a lista de clientes (`/api/clients?minimal=1`), resolve o cliente
  ativo (URL `?client=`, filtro global do CommandStrip ou primeiro da lista) e o injeta via
  `AgencyBrainClientProvider` + `AgencyBrainAiProvider`. Para rotas de feed MVP (learnings/hypotheses)
  renderiza só o feed; para módulos estendidos renderiza header com título/`beta` e subtítulo por
  módulo (`mvp_<module>_title/hint`).

### [`BrainFeedPage`](../../src/components/agency-brain/insights/BrainFeedPage.tsx) (`BrainLearningsPage` / `BrainHypothesesPage`)
- **Props:** `variant: "learnings" | "hypotheses"`.
- **Comportamento:** feed paginado (10/pág) com hero, busca e abas Aprendizados / Hipóteses / Logs
  (research logs só na aba learnings). Dados vêm de `useBrainInsights()` (mock). Abre painel de
  timeline de um aprendizado via `LearningTimelinePanel`.

### [`AgencyBrainContent`](../../src/components/agency-brain/AgencyBrainContent.tsx) + [`useAgencyBrain`](../../src/components/agency-brain/useAgencyBrain.ts) (versão por cliente)
- **Props (`AgencyBrainContent`):** `clientId`.
- **Comportamento:** versão completa por cliente — escopos `client | agency | market`, filtros
  avançados, ações de IA (`Detectar padrões`, `Analisar com IA`), CRUD de aprendizados via modal,
  e ações de curadoria (`approve | reject | archive`). Consome as APIs reais (ver abaixo).

### [`LearningCard`](../../src/components/agency-brain/LearningCard.tsx)
- **Props:** `learning: LearningDto`, `clientId`, `actionLoadingId`, `onApprove/onReject/onArchive/onEdit`, `index?`.
- **Comportamento:** card de aprendizado com status (SUGGESTED/APPROVED/ARCHIVED), impacto,
  `confidenceScore`/100, aviso de baixa confiança (<50, exige confirmação/`force` ao aprovar),
  seções (aprendizado, por que importa, evidências, ação) e link para a campanha relacionada.

### [`BrainShelf`](../../src/components/dashboard/BrainShelf.tsx) (`variant="notice"`)
- Card de alerta exibido na **Destaques** — ver seção "Relação com o card de alerta" abaixo.

---

## Feature flags / gating

### Gate de nível de grupo (plano)
- A entrada do grupo no sidebar é gated por `allowCreativeMemoryAi` (mapeado em
  [`nav-permissions.ts`](../../src/lib/billing/nav-permissions.ts) → `GatedNavId "agencyBrain"` →
  `PlanLimitKey "allowCreativeMemoryAi"`). Sem o entitlement, o item vira link de upgrade.
- O [`layout.tsx`](../../src/app/[locale]/(app)/agency-brain/layout.tsx) envolve tudo em
  `PlanNavGate navId="agencyBrain"`, bloqueando o acesso direto às rotas.

### [`AgencyBrainFeatureFlags`](../../src/lib/agency-brain/domain/modules.ts)
```
allowCreativeMemoryAi        // mestre do grupo
allowAgencyBrainHypotheses
allowAgencyBrainDna
allowAgencyBrainTimeline
allowAgencyBrainExperiments
allowAgencyBrainActionPlans
allowAgencyBrainChat
```
- [`resolveAgencyBrainFeatures(limits)`](../../src/lib/agency-brain/domain/modules.ts): define
  defaults. `allowCreativeMemoryAi` default `true`; `hypotheses`/`dna` herdam do mestre;
  `timeline`/`experiments`/`actionPlans`/`chat` default **`false`**.
- [`isAgencyBrainModuleEnabled(module, features)`](../../src/lib/agency-brain/domain/modules.ts):
  retorna `false` se o mestre estiver off; senão usa a flag do módulo (módulos sem flag passam).
- Origem dos limites: planos de billing (`src/lib/billing`, ex.: `PlanLimits`/`PlanLimitKey`).
  Automações têm gate de plano próprio (`allowNavAutomations`) e a criação de regra valida
  `maxAutomationRules` via `assertLimit` ([`api/automation/rules/route.ts`](../../src/app/api/automation/rules/route.ts)).

---

## Dados, estado e API

### Hooks
- [`useBrainInsights`](../../src/components/agency-brain/insights/useBrainInsights.ts) — feed MVP
  (learnings + hypotheses + timeline), **dados mock** (`src/lib/agency-brain/insights/`).
- [`useAgencyBrain`](../../src/components/agency-brain/useAgencyBrain.ts) — aprendizados reais por
  cliente: paginação, filtros, summary, ações IA e curadoria.
- [`useAgencyLearnings`](../../src/components/agency-brain/useAgencyLearnings.ts) /
  [`useMarketLearnings`](../../src/components/agency-brain/useMarketLearnings.ts) — escopos
  agência e mercado.

### Endpoints (APIs reais — consumidos pela versão por cliente)
| Método | Endpoint | Uso |
|---|---|---|
| GET/POST | [`/api/clients/[clientId]/learnings`](../../src/app/api/clients/[clientId]/learnings/route.ts) | listar / criar aprendizado |
| PATCH | [`/api/clients/[clientId]/learnings/[learningId]`](../../src/app/api/clients/[clientId]/learnings/[learningId]/route.ts) | editar |
| PATCH | [`.../learnings/[learningId]/approve`](../../src/app/api/clients/[clientId]/learnings/[learningId]/approve/route.ts) · [`/reject`](../../src/app/api/clients/[clientId]/learnings/[learningId]/reject/route.ts) · [`/archive`](../../src/app/api/clients/[clientId]/learnings/[learningId]/archive/route.ts) | curadoria (approve valida confiança, code `LOW_CONFIDENCE`) |
| POST | [`.../learnings/suggest`](../../src/app/api/clients/[clientId]/learnings/suggest/route.ts) · [`/ai-suggest`](../../src/app/api/clients/[clientId]/learnings/ai-suggest/route.ts) | detectar padrões / analisar com IA |
| GET/POST | [`/api/clients/[clientId]/hypotheses`](../../src/app/api/clients/[clientId]/hypotheses/route.ts) | listar / criar hipótese |
| POST | [`.../hypotheses/suggest`](../../src/app/api/clients/[clientId]/hypotheses/suggest/route.ts) · [`/ai-suggest`](../../src/app/api/clients/[clientId]/hypotheses/ai-suggest/route.ts) | gerar hipóteses |
| PATCH | [`.../hypotheses/[hypothesisId]/confirm`](../../src/app/api/clients/[clientId]/hypotheses/[hypothesisId]/confirm/route.ts) · [`/reject`](../../src/app/api/clients/[clientId]/hypotheses/[hypothesisId]/reject/route.ts) · [`/promote`](../../src/app/api/clients/[clientId]/hypotheses/[hypothesisId]/promote/route.ts) | confirmar / rejeitar / promover a aprendizado |
| GET/POST | [`/api/automation/rules`](../../src/app/api/automation/rules/route.ts) (+ [`/[ruleId]`](../../src/app/api/automation/rules/[ruleId]/route.ts)) | regras de automação |
| GET/POST | [`/api/clients/[clientId]/action-suggestions`](../../src/app/api/clients/[clientId]/action-suggestions/route.ts) (+ `ai-generate`, `generate`, `[suggestionId]/execute|reject|acknowledge`) | sugestões/Action Center |

### Entities / modelos
- [`ClientLearning`](../../src/db/entities/ClientLearning.ts): `title`, `description`, `category`,
  `impact`, `confidence`, `confidenceScore`, `source`, `status`, `tags`, `metricSnapshot`,
  `evidence`, `dedupeKey`. Status: `SUGGESTED | APPROVED | REJECTED | ARCHIVED`.
- [`ClientHypothesis`](../../src/db/entities/ClientHypothesis.ts): `confidenceScore`, `status`
  (`SUGGESTED | TESTING | CONFIRMED | REJECTED | PROMOTED`), `promotedLearningId`.
- [`AutomationRule`](../../src/db/entities/AutomationRule.ts): `condition` (metric/op/value/minSpend)
  + `action` (`pause_campaign | alert_only | adjust_budget_percent`), por tenant/cliente.
- [`ClientActionSuggestion`](../../src/db/entities/ClientActionSuggestion.ts): sugestões de ação.

---

## Relação com o card de alerta da Destaques

A **Destaques** (`/dashboard`) exibe um card de alerta do Cérebro via
[`BrainShelf`](../../src/components/dashboard/BrainShelf.tsx) com `variant="notice"` (renderizado
em [`DashboardContentLive`](../../src/uxpilot-ui/adapters/DashboardContentLive.tsx)). Ver
[docs/dashboard-destaques](../dashboard-destaques/README.md).

- O "notice" só aparece se houver pendências (`learningsCount + hypothesesCount + suggestionsCount > 0`).
- Mostra um **badge numérico pulsante** = `learningsCount + hypothesesCount` (aprendizados/hipóteses
  pendentes de curadoria) e um CTA **"Ver tudo"** → `/agency-brain/learnings`.
- É dispensável (estado local, não persistido). O mesmo `BrainShelf` tem `variant="feed"` e
  `"shelf"` usados em outros pontos do dashboard/canvas.

---

## i18n

- **Nav** (rótulos do grupo/subitens): namespace `nav` — chaves `agencyBrain`,
  `agencyBrainInsights`, `agencyBrainLearnings`, `agencyBrainHypotheses`, `automations`
  (ver `messages/pt-BR.json` linha ~298) e `nav.upgrade.agencyBrain` (mensagem de plano).
- **Feed MVP**: namespace `brainInsights` (abas, placeholders de busca, banners, paginação).
- **Telas por cliente / shell / cards**: namespace `agencyBrain` (`messages/pt-BR.json` linha ~3364)
  — inclui `beta`, `title/subtitle`, `mvp_<module>_title/hint`, status/impact, mensagens de ação.
- **Card de alerta na Destaques**: namespace `dashboard` (`brainNoticeTitle`, `brainNoticeHint`,
  `brainViewAll`, `brainAlertCount`, etc.).
- Arquivos: [`messages/pt-BR.json`](../../messages/pt-BR.json), [`messages/en.json`](../../messages/en.json).

---

## Pendências / observações

- **Duas implementações coexistem**: as rotas MVP de learnings/hypotheses usam `BrainFeedPage`
  (`useBrainInsights`, **dados reais** via API, `USE_MOCK=false`); existe também a implementação
  alternativa `AgencyBrainContent`/`HypothesesContent` (mesmas APIs, com filtros/escopos/IA) não
  plugada nessas rotas. Definir qual é a oficial e remover/integrar a outra.
  - **Ações do feed agora funcionam** (antes os botões eram placeholders desabilitados): ver abaixo.
- `experiments` tem rota/componente mas não está em `AGENCY_BRAIN_MODULE_REGISTRY`; `suggestions`
  está no registry sem `featureFlag`. Alinhar registry × rotas reais.
- Módulos `timeline`, `chat`, `action-plans`, `labs` são telas **coming soon** (placeholder).
- `AGENCY_BRAIN_MODULES` (em `modules.ts`) lista 9 ids, mas só 8 entradas existem no
  `AGENCY_BRAIN_MODULE_REGISTRY` (sem `experiments`). Conferir consistência.
- Automações (`/automations`) está no grupo do sidebar mas fora da árvore `/agency-brain` e tem
  gate de plano próprio (`allowNavAutomations`).

---

## Telas de Aprendizados/Hipóteses (UI) — atualização

- O cabeçalho [`BrainFeedPage`](../../src/components/agency-brain/insights/BrainFeedPage.tsx)
  **não tem mais as pills** "Aprendizados / Hipóteses / Logs de pesquisa" — a navegação entre
  módulos já está no sidebar. (O acesso a "Logs de pesquisa" saiu dessas telas.)
- Há um **seletor de cliente** (usa `useAgencyBrainClient` → `clients`/`onClientChange`) + busca.
  Trocar o cliente refaz o fetch (`/api/clients/{slug}/learnings|hypotheses`), resolvendo o
  problema de não conseguir selecionar/listar.
- `useBrainInsights` faz **fetch real** (`USE_MOCK=false`); "Nenhum aprendizado" = o cliente
  selecionado não tem aprendizados APPROVED/SUGGESTED de fato.
- **"Todos os clientes" (agregado)** ainda **não** é suportado (APIs são por cliente) — follow-up
  de backend.

## Pesquisa multi-fonte e comparação com concorrentes

Ver documento dedicado: [**pesquisa-e-concorrentes.md**](./pesquisa-e-concorrentes.md).

Resumo: hoje os aprendizados são **sinais sobre as métricas do próprio cliente** (não comparam
concorrentes). Existe scan da **Meta Ad Library** (concorrentes/padrões) acionado por "Refinar
pesquisas", mas é **desconectado** da geração dos aprendizados e da timeline; **Google e outras
fontes não estão integrados**. A timeline mostra só 1 evento sintético e **não registra** as
pesquisas/comparações. O doc traz o diagnóstico completo (arquivos:linha) e o **roadmap** (IA
receber contexto de mercado → comparação estruturada → eventos de pesquisa na timeline → multi-fonte).

## Decisões da v1 da tela (2026-06-25)

A tela de Aprendizados foi simplificada para a v1 — foco em **descobertas automáticas**:

- **Título traduzido**: "Cérebro da agência" (antes hardcoded "Agency Brain"), via `brainInsights.heroTitle`.
- **"Refinar pesquisas" oculto na v1.** A pesquisa multi-fonte (scan da Meta Ad Library) fica para a
  v2, junto do **"laboratório de cientistas"** (motor principal do Brain). O código do refine foi
  mantido (`RefineResearchBar`/`useRefineResearch`) para reuso na v2, apenas não é renderizado.
- **Créditos de IA ocultos** na tela (removido o `AgencyBrainAiBar` do cabeçalho).
- **Fontes reais apenas**: a legenda mostra só **Meta Ads** e **Agência** (regras/IA sobre dados do
  cliente) — Mercado/Concorrência/Hipótese dependiam do refine e voltam na v2.
  ([EvidenceSources.tsx](../../src/components/agency-brain/insights/EvidenceSources.tsx)).
- **Inputs corrigidos no dark mode**: seletor de cliente usa `ui-select` e a busca usa `ui-input`
  (antes era `<select>` cru com fundo branco no dark).

## Ações do feed de aprendizados (funcionais)

[`LearningFeedCard`](../../src/components/agency-brain/insights/LearningFeedCard.tsx) +
[`BrainFeedPage`](../../src/components/agency-brain/insights/BrainFeedPage.tsx):

- O adapter preserva o status real do backend em `InsightLearning.reviewStatus`
  ([adapters.ts](../../src/lib/agency-brain/insights/adapters.ts)). Antes, `SUGGESTED` era
  mapeado para "weakening" e aparecia como **ENFRAQUECENDO** — agora aprendizados sugeridos
  mostram o badge **"Sugerido"**.
- **Aprendizado SUGGESTED**: botões **Aceitar** (PATCH `.../learnings/{id}/approve`, com `force`
  + confirmação se confiança < 50) e **Dispensar** (PATCH `.../reject`). Após a ação, o feed
  recarrega (`useBrainInsights.refresh`).
- **Aprendizado já aceito (APPROVED)**: botão **Gerar hipótese** (antes desabilitado) cria uma
  hipótese a partir do aprendizado (POST `.../hypotheses`, categoria GENERAL) e navega para
  `/agency-brain/hypotheses`.
- Há também geração de hipóteses por IA em nível de cliente (`.../hypotheses/ai-suggest`,
  `.../hypotheses/suggest`) — não exposta no card.

## Histórico de mudanças relevantes
- 2026-06-24 (parte 3): Ações do feed habilitadas (Aceitar/Dispensar para sugeridos; Gerar
  hipótese para aprovados); badge "Sugerido" corrigido (antes mostrava "Enfraquecendo").
- 2026-06-24 (parte 2): Removidas as pills do header; adicionado seletor de cliente + busca.
- 2026-06-24: Criação da documentação.
