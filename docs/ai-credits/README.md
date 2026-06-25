# Camada de créditos IA

> Controle de uso de IA por plano, com pesos por tipo de ação, políticas de agência,
> limites por cliente e **feature flags** desligáveis no admin.

## TL;DR

- **Flag master desligada (default):** comportamento legado — 1 chamada CM/AB = 1 unidade do `maxAiRequestsPerMonth`.
- **Flag master ligada:** créditos ponderados, soma via `creditsCharged` em `ai_recommendations`, políticas de tenant e (opcional) tetos por cliente.
- **Desligar tudo:** Admin → Feature flags IA → desmarcar *Créditos IA V2*.

## Feature flags (admin)

Painel: **`/admin/platform/feature-flags`**

| Flag | Descrição |
|------|-----------|
| `creditsV2Enabled` | **Master.** Liga contagem ponderada e infraestrutura nova. |
| `tenantPolicyUiEnabled` | Aba *Uso de IA* em Configurações. |
| `perClientCapsEnabled` | Campos IA na ficha do cliente (Meta extras). |
| `agentLayerEnabled` | Reservado para P1 (chat → propostas). **Implementado** — ver abaixo. |

Ao desligar a master, as sub-flags são forçadas para `false` no servidor.

## Etapas de implementação

### Etapa 1 — Infra (✅)

- Migration `0051-AiCreditsLayer`
- Tabelas: `platform_settings`, `tenant_ai_policies`
- Colunas: `client_meta_settings.aiEnabled`, `aiMonthlyCap`; `ai_recommendations.creditsCharged`
- Lib: `src/lib/ai-credits/`

### Etapa 2 — Admin (✅)

- API: `GET/PATCH /api/admin/platform/feature-flags`
- UI: `/admin/platform/feature-flags`

### Etapa 3 — Tenant + cliente (✅)

- API: `GET/PATCH /api/settings/ai-credits`
- UI: Configurações → aba *Uso de IA* (visível; mostra aviso se flag off)
- Cliente: toggle `aiEnabled` + `aiMonthlyCap` em Meta extras (quando `perClientCapsEnabled`)

### Etapa 4 — Integração billing (✅)

- `assertCreativeMemoryAiAccess` / `recordCreativeMemoryAiUsage` usam `ai-credits` quando V2 ativo
- `getTenantUsage` soma `creditsCharged` quando V2 ativo
- Chat do Brain passa `clientId` e trata erros `AI_CREDITS_*`

### Etapa 5 — Agente + créditos (✅ parcial)

- [x] **P1.1** — chat com propostas + aprovar (`agentLayerEnabled`)
- [x] Link *Comprar créditos* → `/billing/addons?pack=ai`
- [ ] Checkout self-serve automático (Stripe/Asaas)
- [ ] MCP com pool separado
- [ ] Histórico detalhado / export

## Camada agente (P1.1)

Ativar: `creditsV2Enabled` + `agentLayerEnabled` no admin.

- Chat retorna propostas acionáveis (pausar / escalar / revisar)
- **Aprovar e executar** → `POST /api/agency-brain/chat/proposals/execute`
- Peso `chat_with_proposals` = 3 créditos (com V2)
- Código: `src/lib/agency-brain/chat-agent-service.ts`, `ChatContent.tsx`

## Pesos padrão (créditos por ação)

| Kind | Créditos |
|------|----------|
| `chat` | 1 |
| `chat_with_proposals` | 3 |
| `learnings` | 1 |
| `actions` | 1 |
| `hypotheses` | 1 |
| `recommendations` | 1 |
| `audience_suggestions` | 1 |
| `campaign_generate` | 2 |
| `generic` | 1 |

Editáveis no admin (flag weights).

## Política de tenant

| Campo | Função |
|-------|--------|
| `distributionMode` | `shared_pool` ou `per_client_cap` |
| `alertThresholdPercent` | Banner “perto do limite” (UI) |
| `reservePercent` | % do pool reservado (não gastável por IA) |
| `defaultClientMonthlyCap` | Teto padrão quando modo per-client |

## Comprar mais créditos

1. **Configurações → Uso de IA** → *Comprar mais créditos*
2. Ou direto: `/billing/addons?pack=ai`
3. Solicitação em `/admin/contacts`; admin aplica `extraAiRequestsPerMonth` no tenant

## Como ativar em staging/produção

1. Rodar migração: `npm run db:migrate`
2. Login como platform admin
3. Abrir `/admin/platform/feature-flags`
4. Ligar **Créditos IA V2** → salvar
5. (Opcional) Ligar UI de política e limites por cliente
6. Validar em Configurações → Uso de IA

## Arquivos principais

| Área | Path |
|------|------|
| Core | `src/lib/ai-credits/` |
| Flags admin | `src/app/api/admin/platform/feature-flags/` |
| Settings tenant | `src/app/api/settings/ai-credits/` |
| Uso legado bridge | `src/lib/creative-memory/ai-usage.ts` |
| Agente chat | `src/lib/agency-brain/chat-agent-service.ts` |
| Execute proposta | `src/app/api/agency-brain/chat/proposals/execute/` |

## Histórico

- 2026-06-23: Camada inicial com feature flags, pesos, política de tenant e caps por cliente.
- 2026-06-23: P1.1 agente no chat + fluxo comprar créditos via addons.
