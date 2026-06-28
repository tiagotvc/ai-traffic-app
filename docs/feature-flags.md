# Feature Flags de plataforma (hierárquico)

> Sistema de liga/desliga de **funcionalidades para toda a plataforma**, controlado pelo admin
> (independe do plano). Hierárquico: **Módulo → Funcionalidade → sub-funcionalidade**. Hoje só o
> módulo **Brain** está aplicado no produto; o sistema já está pronto para outros módulos.
>
> **Fonte de verdade desta feature. Atualize este doc a cada incremento.**

## TL;DR

- O admin liga/desliga features na aba **Configurações → Feature Flags → "Módulos & Funcionalidades"**.
- **Default = ON.** Só persistimos overrides `false` (quando o admin desliga algo).
- **Kill-switch acima do plano:** `visível/usável = flagDePlataforma(ON) E permissãoDoPlano`.
  Desligar um pai **cascateia** nos filhos; `dependsOn` cobre interdependências.
- Quando uma feature do Brain é desligada: **some do sidebar** (para todos), a **API é bloqueada** e
  a **página/recurso fica indisponível** — sem impacto nas outras features.

## Não confundir com…

- **Plano/billing (`PlanLimits`):** o que cada plano inclui (upsell). Continua existindo.
- **AI-credits flags** (`creditsV2Enabled`, pesos): seção separada na mesma aba, sistema próprio.

## Módulos registrados (2026-06-27)

Além de **Brain**, **Campanhas** e **Públicos**, o registry agora tem:

- **`ai`** — Inteligência Artificial: `ai.router` (roteador Gemini+Claude — OFF = só Gemini),
  `ai.gemini`, `ai.claude`. Aplicado em [`src/lib/ai/generate.ts`](../src/lib/ai/generate.ts)
  via `isPlatformFeatureEnabled`. Ver [ai-router](./ai-router/README.md).
- **`brain.mcp`** — servidor MCP sobre o Brain. ✅ **Implementado (read-only)** — ver
  [mcp](./mcp/README.md). (+ `brain.mcp.write` — escrita, **pendente** P1.4.)
- **`reports`** — módulo de Relatórios:
  - `reports.v1` (clássico, sem IA) e `reports.v2` (IA: gerar por IA, análise/insights, anomalias,
    consolidado e templates). Desligáveis independentemente.
  - `reports.v3` (entrega ao cliente) + canais `reports.v3.emailPdf` / `reports.v3.emailLink` /
    `reports.v3.whatsapp` — **cada canal liga/desliga separado**; o usuário só escolhe entre os
    habilitados. Gate de servidor em `report-delivery.ts` (skip se canal off) + `buildReportPreview`
    (IA/anomalias só com v2) + `/api/reports/ai-config` (exige v2). UI lê `/api/reports/flags`.
    Ver [relatórios](./relatorios/plano-melhorias-relatorios-dashboard.md).
- **`meta`** — `meta.capi` (Conversions API ✅ engine+teste) e `meta.attribution` (janelas ✅ fundação).
  Ver [meta-conversions](./meta-conversions/README.md). (P0.3/P0.4 e wiring de insights pendentes.)
- **`brain.mcp.write`** — escrita via MCP. ✅ **Implementado** (`propose_action` → proposta pendente).

## Arquitetura

| Peça | Arquivo | Papel |
|---|---|---|
| Registry (árvore) | [`src/lib/feature-flags/registry.ts`](../src/lib/feature-flags/registry.ts) | Define módulos/features (ids hierárquicos por ponto) + resolvedor puro `isFeatureEnabled`. |
| Tipos | [`src/lib/feature-flags/types.ts`](../src/lib/feature-flags/types.ts) | `FeatureNode`, `FeatureFlagMap`. |
| Service (server) | [`src/lib/feature-flags/service.ts`](../src/lib/feature-flags/service.ts) | Lê/grava overrides em `platform_settings` (cache Redis 60s) + `assertFeatureEnabled`. |
| Storage | entity `PlatformSetting` (chave `platform_feature_flags`) | JSON `{ [featureId]: false }` (só overrides OFF). |
| Admin API | [`src/app/api/admin/platform/feature-flags/route.ts`](../src/app/api/admin/platform/feature-flags/route.ts) | GET/PATCH `platformFeatures` + devolve a árvore. |
| Admin UI | [`src/components/admin/AdminFeatureFlagsClient.tsx`](../src/components/admin/AdminFeatureFlagsClient.tsx) | Seção "Módulos & Funcionalidades" (árvore de `DsSwitch`). |

### Resolução (`isFeatureEnabled`)

Uma feature está **habilitada** só se:
1. o próprio id **não** está `false`, **e**
2. **todos os ancestrais** (derivados do id por pontos, ex.: `brain.chat` → `brain`) estão habilitados, **e**
3. todos os `dependsOn` estão habilitados.

Default ON: ausência de override = habilitado. Função **pura** (roda no client e no server).

## Aplicação no produto (módulo Brain)

O ponto de integração é **único e no servidor**: em
[`getEntitlements`](../src/lib/billing/entitlements.ts) os flags de plataforma **mascaram** os
limites do plano (mapa `PLATFORM_MASKED_LIMITS`). Ou seja, `brain.chat` OFF → `allowAgencyBrainChat`
vira `false` no `Entitlements`. Com isso, **tudo** que já lê os limites passa a respeitar o flag
automaticamente, sem editar rota por rota:

- **APIs do Brain** — `assertLimit("allowAgencyBrainX")` nas rotas (hypotheses, dna, chat, timeline,
  experiments, action-plans) passa a bloquear.
- **Páginas do Brain** — o `PlanNavGate navId="agencyBrain"` no
  [layout](../src/app/[locale]/(app)/agency-brain/layout.tsx) bloqueia o módulo quando `brain` OFF.
- **Sidebar (estado funcional)** — `limitsToBrainFeatures(limits)` já reflete o mask.

Para **esconder** (em vez de mostrar "locked/upgrade"), os flags crus de plataforma também são
enviados ao shell (`/api/me/entitlements` → `AppShellSkeleton` → `AppSidebar`) e o
[`AgencyBrainNavGroup`](../src/components/layout/AgencyBrainNavGroup.tsx):
- esconde o **grupo inteiro** se `brain` OFF (não mostra upsell);
- esconde **itens** (Aprendizados, Hipóteses, Automações) cujo `brain.<item>` está OFF.

Mapa limite-do-plano → feature id (em `entitlements.ts`):
`allowCreativeMemoryAi`→`brain`, `allowAgencyBrainHypotheses`→`brain.hypotheses`,
`allowAgencyBrainDna`→`brain.dna`, `allowAgencyBrainTimeline`→`brain.timeline`,
`allowAgencyBrainExperiments`→`brain.labs`, `allowAgencyBrainActionPlans`→`brain.action-plans`,
`allowAgencyBrainChat`→`brain.chat`, `allowNavAutomations`→`brain.automations`.

> **Platform admin** bypassa o kill-switch (vê tudo) porque `applyPlatformAdminEntitlements`
> sobrescreve os limites — útil para QA. Se quiser esconder também do admin, remover esse bypass.

## Como adicionar uma nova feature/módulo

1. Acrescentar o nó em [`registry.ts`](../src/lib/feature-flags/registry.ts) (id hierárquico + label).
2. **Aplicar no produto** (escolha os pontos que fizerem sentido):
   - se houver um `PlanLimit` equivalente, adicionar o par em `PLATFORM_MASKED_LIMITS`
     (`entitlements.ts`) — pega API + página + sidebar de uma vez;
   - para esconder no sidebar, usar `isFeatureEnabled(platformFeatures, id)` no componente de nav;
   - para bloquear uma API sem limite de plano correspondente, usar `assertFeatureEnabled(id)`.
3. Documentar aqui.

## Propagação / cache

Overrides ficam em Redis (60s) e o `entitlements` também (60s). Uma mudança no admin leva **até ~60s**
para refletir para todos (não é tempo real). Aceitável para flags de plataforma.

## Verificação

- Admin → "Módulos & Funcionalidades" → desligar `Brain → Chat` e salvar; recarregar e confirmar
  persistência.
- Desligar `brain.hypotheses` → item "Hipóteses" some do sidebar; API de hypotheses bloqueia.
- Desligar o módulo `brain` → grupo Agency Brain some do sidebar e `/agency-brain/*` fica indisponível.
- Religar → tudo volta (respeitando o plano). Desligar uma feature **não** afeta as outras.

## Limitações conhecidas (follow-ups)

- **Gate por sub-rota:** páginas internas (ex.: `/agency-brain/hypotheses`) só têm gate de
  **módulo** (PlanNavGate). Com a feature OFF, a API bloqueia os dados e o item some do menu, mas o
  *shell* da página ainda carrega via URL direta. Para bloqueio total por sub-rota, adicionar um
  `PlatformFeatureGate featureId="brain.<x>"` nessas páginas.
- **Outros módulos** (Dashboard, Campanhas…) ainda não aplicados — só o registry está pronto.

## Histórico

- 2026-06-26: Sistema criado (registry + service + admin UI/API) e aplicado ao módulo **Brain**
  (mask em `getEntitlements` + esconder no sidebar). MCP confirmado como inexistente (roadmap).
