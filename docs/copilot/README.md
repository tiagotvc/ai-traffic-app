# Orion Copilot — modelo, arquitetura, bugs e roadmap

> ⚠️ **Renomeado (2026-07-02): "Copilot" virou a metade Scientists do Orion Commander.**
> A fonte de verdade da camada de interface agora é [docs/commander/](../commander/README.md);
> as flags migraram para `campaigns.commander.scientists.*` (aliases mantêm `copilot.*`/
> `scientists.*` funcionando). Este doc segue válido como detalhe do **pipeline de
> pesquisa/geração** (cientistas, orchestrators, billing `allowCopilot`).
>
> O **Orion Copilot** é a camada de IA que **pesquisa o mercado** (pipeline de cientistas) e
> **gera/assiste a criação** (campanha, persona, zona). Passa a ser uma **feature separada e
> gateável** (plano + feature flag).
>
> Complementa [docs/labs/](../labs/README.md) (engine de pesquisa) e o
> [Cérebro da agência](../cerebro-da-agencia/README.md).

## TL;DR

- **Copilot = Research (cientistas) + Generation (assistida).** Hoje funciona, mas está **fragmentado**
  em 3 grupos de flag e com o **billing semiconectado** (não enforça nada).
- **Cientistas reais:** `competitor`, `geo`, `testing`, `performance` (este sem UI). **Stubs:**
  `consumer`, `trend`, `hypothesis`, `confidence` (flag existe, skill não → runner marca "skipped").
- **Geração:** quick generator (1‑clique, default Gemini) + wizard 6 passos (default Claude + fallback);
  persona/zona viram `UserPersona`/`UserZone` reutilizáveis (targeting "compiler").
- **Decisão de produto:** Copilot vira feature standalone, com módulo de flag `copilot` de 1º nível e
  gate `allowCopilot` (por **tier**, Advanced+) + `maxScientists` (**slots por execução**). Sem add‑on; o
  **bypass de admin sai do código e vira flag** (rollout `admin_only`). Decisões na seção 7.

## 1. Definição

Duas metades compõem o Copilot:

| Metade | O que faz | Entrada principal |
|---|---|---|
| **Research (cientistas)** | Produz um **Research Dossier** (achados + sugestões + confiança) consumido pelos criadores. | [`pipelines/runner.ts`](../../src/lib/labs/pipelines/runner.ts) |
| **Generation (assistida)** | Cria rascunho de campanha (quick + wizard), persona e zona. | [`ai-campaign-orchestrator.ts`](../../src/lib/campaign-creator/ai-campaign-orchestrator.ts), [`audience-targeting-ai.ts`](../../src/lib/audience-targeting-ai.ts) |

## 2. Arquitetura atual

### 2.1 Research — pipeline de cientistas

- **Contrato** [`skills/types.ts`](../../src/lib/labs/skills/types.ts): `ScientistSkill { id, flagId, canRun(input), run(input) }`.
- **Fábrica** [`skills/index.ts`](../../src/lib/labs/skills/index.ts): registra só os reais (`competitor`, `geo`, `testing`).
- **Data model** [`pipelines/types.ts`](../../src/lib/labs/pipelines/types.ts): `ResearchDossier { sections[], suggestions[], confidence, reach? }`.
- **Runner** [`pipelines/runner.ts`](../../src/lib/labs/pipelines/runner.ts): executa por **escopo** e faz streaming SSE.

| Escopo | Cientistas | Testing |
|---|---|---|
| campaign | competitor + trend + consumer (filtrado pelo passo do wizard) | só no review |
| persona | competitor + trend + consumer | sempre |
| zone | geo | nunca |
| full | marketing + geo | sempre |

| Cientista | Flag | Estado |
|---|---|---|
| **competitor** (Marketing) | `scientists.competitor` | ✅ Meta Ad Library + Google SERP/Trends/YouTube/Maps; cache "data‑first" 7d; orçamento mensal de SearchAPI |
| **geo** | `scientists.geo` | ✅ valida lugares vs briefing + geometria + IBGE/Maps + estimativa de alcance |
| **testing** | `scientists.testing` | ✅ **simulação interna** (não A/B Meta); consome achados anteriores → hipóteses → `ClientHypothesis` (SUGGESTED) |
| **performance** | `scientists.performance` | ✅ backend ([`performance-scientist.ts`](../../src/lib/labs/performance-scientist.ts)) **sem UI** |
| consumer, trend, hypothesis, confidence | `scientists.*` | ⏳ **stub** — flag existe, skill não (pipeline já nasce desenhada) |

Rotas: [`/api/labs/pipeline`](../../src/app/api/labs/pipeline/route.ts) (sync), [`/api/labs/pipeline/stream`](../../src/app/api/labs/pipeline/stream/route.ts) (SSE), [`/api/labs/performance`](../../src/app/api/labs/performance/route.ts), [`/api/zones/insights`](../../src/app/api/zones/insights/route.ts).

### 2.2 Generation — criação assistida

- **Quick generator** [`ai-campaign-orchestrator.ts`](../../src/lib/campaign-creator/ai-campaign-orchestrator.ts) `generateAiCampaignDraft()` — 1‑clique, default **Gemini**; estratégia (`scale_winner`/`new_audience_test`/`creative_refresh`) → draft + copy.
- **Wizard 6 passos** [`ai-campaign-wizard-orchestrator.ts`](../../src/lib/campaign-creator/ai-campaign-wizard-orchestrator.ts) + [`ai-wizard-prepare.ts`](../../src/lib/campaign-creator/ai-wizard-prepare.ts) — default **Claude + fallback Gemini**; fases `audience_preview → audience_targeting → regions_preview → regions_geocode → generate`.
- **Persona/Zona** [`audience-targeting-ai.ts`](../../src/lib/audience-targeting-ai.ts): persona → targeting Meta (flexible_spec) → save; viram `UserPersona`/`UserZone` (modo "compiler").

## 3. Modelo proposto (standalone)

### 3.1 Feature flags — módulo `copilot` de 1º nível
Hoje fragmentado em `scientists` + `campaigns.brain.research` + `audiences.brain.research`. Unificar:

```
copilot
 ├ copilot.campaigns          # assistência no criador de campanha
 ├ copilot.audiences          # persona/zona
 └ copilot.research           # pipeline de cientistas
     ├ research.competitor (+ google/trends/youtube/maps)
     ├ research.geo
     ├ research.testing
     ├ research.performance
     └ research.{consumer,trend,hypothesis,confidence}   # Fase 2
```
Manter `scientists` atual como **alias de migração** (não quebrar overrides salvos).

### 3.2 Billing — `allowCopilot` (gate por tier) + `maxScientists` (slots)
- **`allowCopilot`** = boolean, **incluído do Advanced para cima** (Advanced/Agency/Master). Free/Basic = `false`.
  **Não é add‑on comprável** — é por **tier**.
- Gate único **`assertCopilotAccess(tenant, user)`** = `flagDePlataforma(copilot) E allowCopilot(plano)`,
  chamado em **todas** as entradas (pipeline/stream, persona ai‑generate, campaign ai‑generate/wizard).
  A UI esconde os cards quando off.
- **`maxScientists` = slots por execução**: nº de cientistas que a pipeline ativa por run (por prioridade
  do escopo). Ex.: Advanced **2**, Agency/Master **5**. **Não é cota de uso** → enforçado **no runner**
  (corta a lista de cientistas selecionados para N), **fora** de `LIMIT_CHECKS`/`TenantUsage`. Sem tracking
  de uso e sem add‑on.

### 3.3 Provider/IA
- Padronizar **default Claude + fallback Gemini** em todos os caminhos (hoje quick=Gemini, wizard=Claude).
- Propagar o **`modelUsed` real** (ex.: `claude-…`) ponta a ponta para billing/auditoria.

### 3.4 Bypass de admin via feature flags (não em código) — transversal
Não queremos **bypass hardcoded**. Hoje `applyPlatformAdminEntitlements`
([entitlements.ts](../../src/lib/billing/entitlements.ts)) sobrescreve os limites do admin para **tudo `true`**.
**Remover** isso e mover o "bypass" para o **resolver das flags**. Para capacidades mapeadas a uma flag
(`PLATFORM_MASKED_LIMITS`), a regra passa a ser:

- **usuário normal:** `limite = plano E flag` (kill‑switch, como hoje);
- **platform admin:** **só a flag decide** — `admin_only`/`global` → **concede** (ignora o plano), `off` → bloqueia.

Esboço (`getEntitlements` deixa de chamar `applyPlatformAdminEntitlements`):
```
enabled = isFeatureEnabledForUser(flags, featureId, ctx)   // admin_only já libera p/ admin
limite[key] = ctx.isPlatformAdmin ? enabled : (plano[key] && enabled)
```
Assim "ativar só para o admin" é configurado na **UI de flags** (rollout `admin_only`), sem código.
⚠️ **Cross‑cutting** (afeta todas as features, não só Copilot) e nota: capacidades **sem flag mapeada**
não têm bypass — o admin recebe o limite do **plano**; se precisar liberar algo p/ QA, **mapeia uma flag**.

## 4. Bugs (priorizados)

### 🔴 P0 — billing do Copilot não enforça
| # | Onde | Problema | Correção (decidida) |
|---|---|---|---|
| 1 | [`entitlements.ts`](../../src/lib/billing/entitlements.ts) `LIMIT_CHECKS` | `maxScientists` tratado como cota retornando `0` → erro de tipo/semântica | **tirar de `LIMIT_CHECKS`/`NumericPlanLimitKey`**: vira **capacidade** lida pelo runner (cap de N cientistas/run), não cota de uso |
| 2 | rotas do Copilot | `allowCopilot` **não checado** em nenhuma rota | `assertCopilotAccess` em pipeline/persona/campaign |
| 3 | [`entitlements.ts`](../../src/lib/billing/entitlements.ts) `applyPlatformAdminEntitlements` | **bypass hardcoded de admin** (tudo `true`) — não queremos | **remover**; mover o bypass p/ o resolver das flags: admin → flag decide (ignora plano), normal → plano E flag (ver 3.4) |

### 🟠 P1 — metadados/provider inconsistentes
| # | Onde | Problema |
|---|---|---|
| 4 | [`audience-targeting-ai.ts`](../../src/lib/audience-targeting-ai.ts) | `AudiencePersonaPreviewSchema` sem `provider`/`modelUsed`, mas o retorno exige (usar `…PayloadSchema`) |
| 5 | [`ai-campaign-orchestrator.ts`](../../src/lib/campaign-creator/ai-campaign-orchestrator.ts) | `provider:"gemini"` hardcoded no `fakeSuggestion`; `classifyLlmError(err,"gemini")` fixo |
| 6 | [`ai-campaign-wizard-orchestrator.ts`](../../src/lib/campaign-creator/ai-campaign-wizard-orchestrator.ts) | `draft.meta` não grava `provider`/`modelUsed` |
| 7 | [`AiWizardSummaryStep.tsx`](../../src/components/campaign-creator/ai-wizard/AiWizardSummaryStep.tsx) | `provider:"claude"` literal em vez da união `LlmProviderId` |

### 🟡 P2 — modelo/dados
| # | Onde | Problema |
|---|---|---|
| 8 | `ai-campaign-orchestrator.ts` | `avoidSegmentIds` criado mas **nunca populado** (exclusões padrão do cliente não chegam na persona) |
| 9 | [`campaign-draft.ts`](../../src/lib/campaign-draft.ts) | falta objetivo **`app_promotion`** (distinto de `app`) |
| 10 | [`geo-reach.ts`](../../src/lib/labs/geo-reach.ts) vs `/api/zones/insights` | estimativa de alcance **duplicada** (copy‑paste) |
| 11 | `performance-scientist.ts` | **sem UI** (backend + API prontos) |

## 5. Melhorias (priorizadas)
1. **Gating unificado** do Copilot (3.1 + 3.2) + esconder cards por entitlement.
2. **Implementar os 4 stubs** (consumer/trend/hypothesis/confidence).
3. **Surfar o Performance Scientist** (PerformanceReadoutCard no Brain).
4. **Tracking + add‑on de `maxScientists`**.
5. Provider/metadata consistentes (3.3).
6. Dedup de reach + `normalizeNiche()` compartilhado.

## 6. Roadmap por fases
- **Fase 1 — destrava + correto:** billing do Copilot (P0) + gating unificado + bugs de metadados (P1).
- **Fase 2 — valor:** stubs de cientistas + UI do Performance + add‑on/tracking de slots.
- **Fase 3 — polimento:** provider/metadata fino, dedup de reach, `app_promotion`.

## 7. Decisões (resolvidas em 2026‑06‑30)
1. **`maxScientists` = slot** — capacidade de cientistas **por execução**, capada no runner (não cota mensal, sem tracking de uso).
2. **Copilot por tier** — incluído do **Advanced para cima** (Advanced/Agency/Master). **Não é add‑on comprável.**
3. **Criar o módulo de flag `copilot`** (1º nível) e **migrar** o `scientists` atual (alias).
4. **Bypass de admin via feature flags, não em código** — **remover** `applyPlatformAdminEntitlements`; no resolver, admin → a flag decide (`admin_only`/`global` concede e ignora plano; `off` bloqueia), normal → `plano E flag` (transversal — ver 3.4).

## 8. Pontos de entrada (referência rápida)
- Cientistas: `src/lib/labs/skills/*`, `src/lib/labs/pipelines/*`, `src/lib/labs/performance-scientist.ts`
- Geração: `src/lib/campaign-creator/ai-*`, `src/lib/audience-targeting-ai.ts`, `src/lib/zone-targeting-ai.ts`
- Billing: `src/lib/billing/{types,entitlements,tenant-addons,plan-limits-schema}.ts`
- Flags: `src/lib/feature-flags/registry.ts` (módulo `scientists` + `campaigns.brain.research` + `audiences.brain.research`)
- UI: `ResearchPipelineCard`, `CampaignCreatorResearchCard`, `PersonaCreatorBrainTips`, `ZoneCreatorBrainTips`

## Histórico
- 2026-06-30: **Fase 1 implementada** (destrava + correto). (A) Flags: criado o módulo `copilot`
  de 1º nível (`copilot.campaigns/audiences/research` + `research.*`), removidos `scientists` e
  `*.brain.research` do registry, e adicionada **camada de alias** (`FEATURE_ALIASES` +
  `migrateLegacyFlagIds` no read/write do `service.ts`) que migra overrides salvos sem migration de
  banco; `flagId` dos skills e rotas (`zones/insights`, `labs/performance`, `audiences/flags`) e o
  módulo de rota (`modules.ts`) movidos para `copilot.*`. (B) Billing P0: `maxScientists` virou
  **capacidade** (`CAPACITY_LIMIT_KEYS`, fora de `LIMIT_CHECKS`/`assertLimit`), capada no **runner**
  por slots/escopo; removido `applyPlatformAdminEntitlements` — admin agora depende da flag
  (`maskLimitsWithPlatformFlags`: normal = `plano E flag`, admin = a flag decide), com
  `allowCopilot → "copilot"` em `PLATFORM_MASKED_LIMITS`. (C) `assertCopilotAccess` nas 5 rotas
  (pipeline/stream/ai-generate/ai-wizard/audience-targeting), repassando `maxScientists`. (E) Hook
  `useCopilotAccess` esconde os 3 cards por flag+entitlement. (D) Bugs P1 #4–#7: persona round-trip
  via `…PayloadSchema`; provider real no `applySavedTargetingSuggestion` e no `classifyLlmError`;
  `aiProvider`/`aiModelUsed` em `draft.meta`; união `LlmProviderId` no `AiWizardSummaryStep`.
  ⚠️ Transversal: admin deixou de receber `PLATFORM_ADMIN_LIMITS` — capacidades sem flag vêm do plano.
- 2026-06-30: Decisões fechadas (seção 7) — `maxScientists`=slot (cap no runner), Copilot por tier
  (Advanced+, sem add‑on), criar módulo de flag `copilot` (migrar `scientists`), e **bypass de admin
  via feature flags** (remover `applyPlatformAdminEntitlements`; resolver: admin → flag decide/ignora
  plano, normal → plano E flag). Bugs P0 atualizados. Próximo: planejar/implementar Fase 1.
- 2026-06-30: Documento criado — modelo do Orion Copilot como feature standalone (research + generation),
  arquitetura atual, bugs (P0 billing, P1 metadados, P2 modelo) e roadmap.
