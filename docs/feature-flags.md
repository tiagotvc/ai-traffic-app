# Feature Flags de plataforma (hierárquico + rollout)

> Sistema de controle de **funcionalidades para toda a plataforma**, com modos de rollout
> por módulo e sub-funcionalidade. Controlado pelo admin (independe do plano).
>
> **Fonte de verdade desta feature. Atualize este doc a cada incremento.**

## TL;DR

- Admin → **Configurações → Feature Flags IA** → módulo na sidebar esquerda → rollout na direita.
- **Quatro modos de rollout:** `off` | `admin_only` | `global` | `specific_users`.
- **Default = `global`** (comportamento anterior: tudo ligado). Legado `{ id: false }` migra para `off` na leitura.
- **Kill-switch acima do plano:** `visível/usável = rollout(usuário) E permissãoDoPlano`.
- Sub-funcionalidades **herdam** o rollout do módulo salvo override explícito.
- **Platform admin** respeita rollout: `off` esconde para todos; `admin_only` mostra só para admins.

## Modos de rollout

| Modo | Comportamento |
|---|---|
| `off` | Desligado para todos, **incluindo platform admins** (cascateia nos filhos). |
| `admin_only` | Só platform admins (`platformRole === admin`). |
| `global` | Todos os usuários (ainda respeita plano/billing). |
| `specific_users` | Apenas usuários na allowlist (`allowedUserIds`). |

Persistência em `platform_settings` (chave `platform_feature_flags`):

```json
{
  "visions": { "mode": "admin_only" },
  "campaigns.ai-generate": {
    "mode": "specific_users",
    "allowedUserIds": ["uuid-1", "uuid-2"]
  }
}
```

Ausência de chave = herdar pai / `global` na raiz. `mode: global` no PATCH **remove** o override.

## Arquitetura

| Peça | Arquivo | Papel |
|---|---|---|
| Registry (árvore) | [`src/lib/feature-flags/registry.ts`](../src/lib/feature-flags/registry.ts) | Módulos/features + `isFeatureEnabledForUser`, `resolveAllFeaturesForUser`. |
| Tipos | [`src/lib/feature-flags/types.ts`](../src/lib/feature-flags/types.ts) | `FeatureRolloutMode`, `FeatureFlagEntry`, `FeatureFlagConfigMap`, `ResolvedFeatureMap`. |
| Service (server) | [`src/lib/feature-flags/service.ts`](../src/lib/feature-flags/service.ts) | CRUD em `platform_settings` (Redis 60s) + `isPlatformFeatureEnabled` / `assertFeatureEnabled`. |
| Admin API | [`src/app/api/admin/platform/feature-flags/route.ts`](../src/app/api/admin/platform/feature-flags/route.ts) | GET/PATCH config cru + registry. |
| Entitlements | [`src/app/api/me/entitlements/route.ts`](../src/app/api/me/entitlements/route.ts) | Devolve `platformFeatures` **resolvido** por usuário (booleans). |
| Admin UI | [`src/components/admin/AdminFeatureFlagsClient.tsx`](../src/components/admin/AdminFeatureFlagsClient.tsx) | Seletor de rollout + user picker. |
| User picker | [`src/components/admin/FeatureFlagUserPicker.tsx`](../src/components/admin/FeatureFlagUserPicker.tsx) | Busca `/api/admin/users`. |

### Resolução (`isFeatureEnabledForUser`)

Uma feature está **habilitada** para um usuário se:

1. Nenhum ancestral tem `mode: off` explícito, **e**
2. O rollout efetivo (herança root → id) permite o usuário (`admin_only` → só admins; `specific_users` → só allowlist), **e**
3. Todos os `dependsOn` estão habilitados.

O mask em [`entitlements.ts`](../src/lib/billing/entitlements.ts) (`PLATFORM_MASKED_LIMITS`) aplica o rollout sobre limites de plano.

## Módulos registrados

- **`visions`** — Visões (galeria + canvas). Sub: `visions.canvas`, `visions.sharing`, `visions.ai-builder`, `visions.resize`. Mapeados para `allowDashboardCanvas`, `allowDashboardSharing`, etc. Sidebar e páginas `/dashboard/views`, `/dashboard/apps/*`.
- **`campaigns`** — Criador Meta + sub-flags IA/Brain.
- **`audiences`** — Públicos / personas.
- **`brain`** — Agency Brain (+ MCP).
- **`reports`** — v1/v2/v3 + canais de entrega.
- **`scientists`** — Cientistas Labs.
- **`ai`** — Roteador Gemini/Claude.
- **`meta`** — CAPI + atribuição.

## Como adicionar uma nova feature/módulo

**Obrigatório** para qualquer módulo novo no produto:

1. **Registrar** o nó em [`registry.ts`](../src/lib/feature-flags/registry.ts) (`id` hierárquico + label).
2. **Mapear plano** (se houver `PlanLimit`): adicionar par em `PLATFORM_MASKED_LIMITS` em `entitlements.ts`.
3. **Sidebar:** usar `platformFeatures?.<id> !== false` (mapa resolvido do shell) ou `usePlatformFeature("<id>")`.
4. **Páginas server:** confiar em `getEntitlements` com `userId` (mask já aplicado) ou `assertFeatureEnabled("<id>")` nas APIs.
5. **APIs:** `await assertFeatureEnabled("modulo.sub")` — usa contexto da requisição automaticamente.
6. **Documentar** aqui.

### Gate UI vs API

```typescript
// Client (sidebar, componentes)
const on = usePlatformFeature("visions");

// Server (API route)
import { assertFeatureEnabled } from "@/lib/feature-flags/service";
await assertFeatureEnabled("visions.canvas");
```

### Testar rollout

| Cenário | Como |
|---|---|
| Admin only | Modo `admin_only` → login como admin da plataforma vê; usuário comum não. |
| Usuário específico | Modo `specific_users` + picker; só usuários listados. |
| Global / off | `off` esconde para todos (incl. admin); `global` + plano sem limite → upsell/locked (billing). |

## Migração de dados legados

Não há migration SQL: valor JSON em `platform_settings`. Na leitura, `false` → `{ mode: "off" }`, `true` → `{ mode: "global" }`. Comportamento existente preservado (só `false` explícitos desligavam globalmente).

## Propagação / cache

Config cru: Redis 60s (`platform:feature_flags`). Entitlements por usuário: Redis 60s (`entitlements:{tenantId}:{userId}`). Mudanças no admin levam até ~60s para refletir.

## Verificação

- Admin → Visões → `admin_only` → salvar → usuário comum não vê item no sidebar.
- Admin → Visões → `specific_users` + usuário beta → só esse usuário (+ admin) vê Visões.
- Campanhas → sub-flag `campaigns.ai-generate` → `off` → API `/api/campaign-creator/ai-generate` retorna `feature_disabled`.
- `npx tsc --noEmit` sem erros.

## Histórico

- 2026-06-29: Rollout modes (`off` / `admin_only` / `global` / `specific_users`), módulo **Visões**, admin UI com seletor + user picker, entitlements por usuário.
- 2026-06-26: Sistema criado (registry + service + admin UI/API) e aplicado ao módulo **Brain**.
