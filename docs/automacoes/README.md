# Automações (aba do grupo Cérebro da agência)

> Rota: `/automations` ([page](../../src/app/[locale]/(app)/automations/page.tsx)).
> Fonte de verdade desta feature. Atualize este doc a cada incremento/decremento.

## Visão geral

Regras **se-então** que monitoram a performance das campanhas e executam ações automaticamente:
pausar campanha, ajustar orçamento (%) ou apenas gerar alerta. O nome "Automações" é adequado.

## Arquitetura / fluxo de arquivos

| Camada | Arquivo |
|---|---|
| Rota | [`src/app/[locale]/(app)/automations/page.tsx`](../../src/app/[locale]/(app)/automations/page.tsx) → `AutomationsView` → `AutomationsContentLive` |
| UI principal | [`src/components/AutomationsRulesView.tsx`](../../src/components/AutomationsRulesView.tsx) |
| API (listar/criar) | [`src/app/api/automation/rules/route.ts`](../../src/app/api/automation/rules/route.ts) |
| API (ativar/editar/excluir) | [`src/app/api/automation/rules/[ruleId]/route.ts`](../../src/app/api/automation/rules/[ruleId]/route.ts) |
| Entity | [`src/db/entities/AutomationRule.ts`](../../src/db/entities/AutomationRule.ts) |
| **Motor de execução** | [`src/lib/automation-engine.ts`](../../src/lib/automation-engine.ts) |
| Disparo do motor | `runAutomationEngine(...)` em [`sync-meta.ts`](../../src/lib/sync-meta.ts) e [`sync-queue.ts`](../../src/lib/sync-queue.ts) |

## Funcional? Sim

O motor (`automation-engine.ts`) roda **a cada sincronização do Meta**: busca regras habilitadas,
analisa os últimos 7 dias, avalia a condição (métrica/operador/valor + `minSpend` opcional) e
executa a ação (`alert_only` | `pause_campaign` | `adjust_budget_percent`), sempre gerando um
`Alert` para auditoria. CRUD completo via API, com limite por plano (`maxAutomationRules`).

## Modelo (AutomationRule)

`tenantId`, `clientId?` (null = todos os clientes), `name`, `enabled`, `condition` (JSONB:
`metric`/`op`/`value`/`minSpend?`), `action` (JSONB: `type`/`budgetPercent?`).

## Conformidade visual (2026-06-24)

O header customizado foi substituído por **`PageToolbar`** (ícone + título + subtítulo + ação
"Criar regra"), igual às demais telas. `showGlobalFilters`/`showSync` desligados (regras são
tenant-wide, não dependem de cliente/período). O resto da tela (hero, templates, lista, modal de
criação) foi mantido.

## Logs de execução (2026-06-25)

A lista de regras agora mostra **quantas vezes cada regra disparou** e a **última execução**.
Derivado dos `Alert`s gerados pelo motor (`Alert.automationRuleId`), via SQL no
`GET /api/automation/rules` (count + max(createdAt) agrupado por regra) — **sem migration e sem
tocar no motor**. Best-effort (try/catch): se faltar a coluna, segue sem logs.

## Pendências / observações

- Subtítulo atualizado para descrever o padrão se-então.
- **i18n**: a tela ainda é PT-only (hardcoded). Tradução completa = follow-up (superfície grande,
  não feita para evitar regressão de JSX em massa).
- Para um log mais rico (cada disparo com detalhe), os `Alert`s de `source="automation"` já têm o
  histórico — uma aba "execuções" detalhada pode listá-los no futuro.

## Histórico de mudanças relevantes
- 2026-06-24: Header conformado ao `PageToolbar`; documentação criada (motor já era funcional).
