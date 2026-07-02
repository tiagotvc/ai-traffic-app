# Automações (aba do grupo Cérebro da agência)

> Rota: `/automations` ([page](../../src/app/[locale]/(app)/automations/page.tsx)).
> Fonte de verdade desta feature. Atualize este doc a cada incremento/decremento.

## Visão geral

Regras **se-então** que monitoram a performance das campanhas e executam ações automaticamente:
pausar campanha, ajustar orçamento (%) ou apenas gerar alerta. O nome "Automações" é adequado.

## Arquitetura / fluxo de arquivos

| Camada | Arquivo |
|---|---|
| Rota (lista) | [`src/app/[locale]/(app)/automations/page.tsx`](../../src/app/[locale]/(app)/automations/page.tsx) → `AutomationsView` → `AutomationsContentLive` |
| UI lista | [`src/components/AutomationsRulesView.tsx`](../../src/components/AutomationsRulesView.tsx) |
| Modal de escolha | [`src/components/automations/AutomationCreateModeModal.tsx`](../../src/components/automations/AutomationCreateModeModal.tsx) |
| Rota (stepper) | [`src/app/[locale]/(app)/automations/rules/new/`](../../src/app/[locale]/(app)/automations/rules/new/) → `AutomationRuleCreatorView` + `steps/` |
| Templates/tipos/helpers | [`src/lib/automation/rule-templates.ts`](../../src/lib/automation/rule-templates.ts) |
| API (listar/criar) | [`src/app/api/automation/rules/route.ts`](../../src/app/api/automation/rules/route.ts) |
| API (ativar/editar/excluir) | [`src/app/api/automation/rules/[ruleId]/route.ts`](../../src/app/api/automation/rules/[ruleId]/route.ts) |
| Entity | [`src/db/entities/AutomationRule.ts`](../../src/db/entities/AutomationRule.ts) |
| **Motor de execução (métrica)** | [`src/lib/automation-engine.ts`](../../src/lib/automation-engine.ts) — `runAutomationEngine` |
| Disparo do motor de métrica | `runAutomationEngine(...)` em [`sync-meta.ts`](../../src/lib/sync-meta.ts) e [`sync-queue.ts`](../../src/lib/sync-queue.ts) (sob demanda, a cada sync) |
| **Motor de execução (horário)** | `runScheduleAutomations` em [`automation-engine.ts`](../../src/lib/automation-engine.ts) |
| Disparo do motor de horário | Cron [`/api/cron/automation-schedule`](../../src/app/api/cron/automation-schedule/route.ts) (hora em hora, `vercel.json`) |
| Simulação/backtest | [`src/lib/automation/simulate.ts`](../../src/lib/automation/simulate.ts) + [`POST /api/automation/rules/simulate`](../../src/app/api/automation/rules/simulate/route.ts) |
| Fila de aprovação | Entity [`AutomationPendingAction`](../../src/db/entities/AutomationPendingAction.ts) + [`src/app/api/automation/pending-actions/`](../../src/app/api/automation/pending-actions/) |
| Tier por plano | `PlanLimits.automationTier` em [`src/lib/billing/types.ts`](../../src/lib/billing/types.ts) + [`useAutomationTier`](../../src/hooks/useAutomationTier.ts) |

## Funcional? Sim

O motor (`automation-engine.ts`) roda **a cada sincronização do Meta**: busca regras habilitadas,
analisa os últimos 7 dias, avalia a condição (métrica/operador/valor + `minSpend` opcional) e
executa a ação (`alert_only` | `pause_campaign` | `adjust_budget_percent`), sempre gerando um
`Alert` para auditoria. CRUD completo via API, com limite por plano (`maxAutomationRules`).

## Modelo (AutomationRule)

`tenantId`, `clientId?` (null = todos os clientes), `name`, `enabled`, `condition` (JSONB:
`metric`/`op`/`value`/`minSpend?`), `action` (JSONB: `type`/`budgetPercent?`).

## UX: lista + modal de escolha + stepper (2026-06-30)

A tela `/automations` virou uma **tela de gestão** seguindo o
[padrão de fluxo de criação](../creation-flow-pattern.md):

1. **Lista** ([`AutomationsRulesView`](../../src/components/AutomationsRulesView.tsx)): `PageToolbar` +
   "Suas regras" (badge Ativa/Pausada, preview SE→ENTÃO, toggle, excluir) + empty state com CTA.
   Removidos o hero "Piloto automático", os 3 passos e o grid de templates inline.
2. **"Criar regra"** abre o [`AutomationCreateModeModal`](../../src/components/automations/AutomationCreateModeModal.tsx):
   cards de check (`CreationModeChoiceCard`) — "Regra personalizada" + os templates ativos.
3. Continuar **navega** para o **stepper** `/automations/rules/new` (`?template=<id>` pré-preenche;
   `?mode=custom` vazio): 3 passos (Gatilho → Ação → Revisão), preview ao vivo na sidebar, salva via
   `POST /api/automation/rules` e volta à lista.

Templates, tipos e helpers (`conditionText`/`actionLabel`/`ruleFormToPayload`…) ficam centralizados em
[`src/lib/automation/rule-templates.ts`](../../src/lib/automation/rule-templates.ts), reusados por lista,
modal e stepper.

### Conformidade visual (2026-06-24)

O header já usava **`PageToolbar`** (ícone + título + subtítulo + ação "Criar regra");
`showGlobalFilters`/`showSync` desligados (regras são tenant-wide).

## Logs de execução (2026-06-25)

A lista de regras agora mostra **quantas vezes cada regra disparou** e a **última execução**.
Derivado dos `Alert`s gerados pelo motor (`Alert.automationRuleId`), via SQL no
`GET /api/automation/rules` (count + max(createdAt) agrupado por regra) — **sem migration e sem
tocar no motor**. Best-effort (try/catch): se faltar a coluna, segue sem logs.

## Gatilho de horário (2026-07-01)

Além das condições de métrica, uma regra pode ter `kind: "schedule"`: uma janela `condition.schedule =
{ startHour, endHour }` (hora local 0–23, todo dia, horário de Brasília). Fora da janela a campanha é
pausada; dentro dela é **reativada automaticamente — só se foi a própria regra que a pausou** (nunca
uma pausa manual do usuário). Ação é implícita (`action.type = "schedule_toggle"`), sem picker no passo 2.

Diferença chave de arquitetura: o motor de métricas (`runAutomationEngine`) só roda **a cada sincronização
do Meta**, que é sob demanda (usuário aciona `/api/sync/run`), não periódica — não serviria para "pausar
às 20h" sozinho. Por isso o gatilho de horário tem um motor próprio,
[`runScheduleAutomations`](../../src/lib/automation-engine.ts), chamado pelo cron
[`/api/cron/automation-schedule`](../../src/app/api/cron/automation-schedule/route.ts) (hora em hora, todos
os tenants, `vercel.json`). Ele busca o status ao vivo das campanhas na Meta (`fetchCampaigns`), não depende
de `campaignMetricSnapshot`.

**Rastreio "fui eu que pausei"**: usa o campo `Alert.metricKey` (`"schedule:paused"` /
`"schedule:activated"`) — antes de reativar, busca o Alert mais recente daquele
`automationRuleId`+`metaCampaignId` e só age se o último marcador for `schedule:paused`. Limitação
conhecida: `Alert` tem índice único por `(tenantId, type, clientId, metaCampaignId, dedupDay)` e todo
alerta de automação usa `type: "OTHER"` — se outro alerta do mesmo tipo já existir hoje para a campanha,
o insert do marcador falha silenciosamente (try/catch) e a regra não reativa naquele dia (falha segura,
não trava a pausa, só atrasa a reativação).

Template "Pausar fora do horário" (`off-hours` em `rule-templates.ts`) agora está habilitado (era
`soon: true`).

## Simulação / backtest (2026-07-01)

No passo de **Revisão** do stepper, o card "Simular últimos 30 dias"
([`AutomationRuleSimulationCard`](../../src/components/automations/AutomationRuleSimulationCard.tsx))
roda a regra contra o histórico real antes de ativar: `POST /api/automation/rules/simulate` →
[`simulateRule`](../../src/lib/automation/simulate.ts) faz o replay dia a dia (janela móvel de 7 dias,
mesma agregação e mesma `normalizeConditionGroups` do motor) sobre os `CampaignMetricSnapshot`.
Mostra campanhas que teriam disparado, gasto evitado (pausa), acréscimo de orçamento (ajuste %) ou
dias-alerta. 100% read-only. Regras de agenda não são simuláveis (snapshots são diários).
Contexto estratégico: [`docs/orion-engine/README.md`](../orion-engine/README.md) (lacuna de mercado #1).

## Escopo por tenant no motor (fix 2026-07-01)

Regras sem `clientId` faziam `adRepo.find()` **sem filtro** — varriam contas de anúncio de todos os
tenants. Agora `accountsForRule()` (em `automation-engine.ts`) sempre resolve os clientes do tenant
primeiro e filtra as contas por eles; regra com `clientId` valida que o cliente pertence ao tenant.
Vale para os dois motores (métrica e horário); a simulação já nasceu com o escopo correto.

## Tiers por plano (2026-07-01)

O Orion Engine tem 4 tiers de funcionalidade (`PlanLimits.automationTier`, 1–4 — ver
[`docs/orion-engine/README.md`](../orion-engine/README.md)), mapeados assim:
**Free/Basic = 1** (automações desligadas via `allowNavAutomations`), **Advanced = 2**
(simulação + modos de execução), **Agency = 3** (reservado: playbooks/IA), **Master = 4**
(reservado: agentes). Rebaixar o tier **nunca quebra** regras existentes: o motor
(`effectiveExecutionMode` em `automation-engine.ts`) força `executionMode: "auto"` sempre
que `automationTier < 2`, mesmo que a coluna diga outra coisa — cada tier é estritamente
aditivo sobre o anterior, e desligar um tier só esconde a opção na UI/API, nunca corrompe
dado nem para o motor.

## Modos de execução + fila de aprovação (2026-07-01)

Toda ação destrutiva (`pause_campaign`, `adjust_budget_percent`, e o `schedule_toggle` do
gatilho de horário) agora respeita `AutomationRule.executionMode`:

- **`auto`** (default, comportamento histórico): executa direto na Meta.
- **`alert`**: nunca executa — só gera um `Alert` dizendo o que faria ("pausaria a campanha…").
- **`approval`**: cria uma linha em `AutomationPendingAction` (status `pending`) em vez de
  chamar a Meta; a regra só age quando alguém aprova.

Fila de pendências: `GET /api/automation/pending-actions` (lista `status=pending` por
padrão) + `POST /api/automation/pending-actions/[id]/approve|reject`. Aprovar executa a
ação real agora (`pauseCampaign`/`activateCampaign`/`updateCampaignDailyBudget`, buscando
orçamento atual no caso de ajuste %) e grava o mesmo `Alert` que o caminho `auto` geraria
— inclusive o marcador `metricKey: "schedule:paused"` quando a regra é de agenda, pra a
reativação automática continuar funcionando depois de uma aprovação manual. Painel de
pendências: seção "Pendentes de aprovação" no topo de
[`AutomationsRulesView`](../../src/components/AutomationsRulesView.tsx) (só busca/renderiza
quando `automationTier >= 2`, via [`useAutomationTier`](../../src/hooks/useAutomationTier.ts)).

Escolha do modo: passo de Revisão do stepper (`ReviewStep`), dropdown "Modo de execução" —
só aparece quando `automationTier >= 2` **e** a ação não é `alert_only` (que já é
"só avisar" por natureza, não precisa do seletor).

## Pendências / observações

- Subtítulo atualizado para descrever o padrão se-então.
- **i18n**: a tela ainda é PT-only (hardcoded). Tradução completa = follow-up (superfície grande,
  não feita para evitar regressão de JSX em massa).
- Para um log mais rico (cada disparo com detalhe), os `Alert`s de `source="automation"` já têm o
  histórico — uma aba "execuções" detalhada pode listá-los no futuro.

## Ação "Reativar campanha" (2026-07-01)

Novo `action.type = "reactivate_campaign"` para regras de **métrica** (independente do gatilho de
horário): "SE ROAS > 2 ENTÃO reativar campanha" — útil pra retomar sozinho uma campanha pausada
manualmente (ou por outra automação) quando a performance histórica volta a compensar. Template
"Reativar campanha lucrativa" em `rule-templates.ts`.

Diferente do gatilho de horário (que só reativa o que ele mesmo pausou), essa ação reativa
**qualquer** campanha pausada que bater a condição — é opt-in: o usuário cria a regra sabendo
disso. Gate de segurança no motor: só age se `campaignMeta.get(id)?.status === "PAUSED"` (evita
chamadas/alertas redundantes numa campanha já ativa). Respeita `executionMode` como as outras
ações (auto/alert/approval).

## Ação "Notificar por e-mail" (2026-07-01)

Novo `action.type = "notify_email"` (regra de métrica): "SE CPL > R$ 50 ENTÃO notificar por
e-mail" — além do `Alert` interno (como `alert_only`), envia um e-mail de texto simples pro
endereço configurado na regra (`action.recipientEmail`, guardado no `action` JSONB — sem
migration). Reusa [`sendReportEmail`](../../src/lib/report-notify.ts) (Resend, mesma infra dos
relatórios agendados por e-mail) — precisa de `RESEND_API_KEY` no ambiente; sem a env var, o
envio falha silenciosamente (best-effort, o `Alert` já registra o disparo de qualquer forma).

Não respeita `executionMode` — é não-destrutiva como `alert_only` (sempre dispara; não há nada
pra "aprovar" ou "auto-executar" além do envio em si), então o passo de Revisão esconde o
seletor de modo de execução pra essa ação, igual já fazia com `alert_only`. UI: campo de e-mail
aparece no passo 2 (`ActionStep`) quando essa ação é selecionada; API valida formato via
`z.string().email()` e exige o campo quando `type === "notify_email"`.

## Ação "Escalar orçamento gradualmente" (2026-07-01)

Novo `action.type = "scale_gradual"` (regra de métrica): em vez de aplicar o aumento de uma vez
(`adjust_budget_percent`), sobe o orçamento em **incrementos menores ao longo de vários dias**
(`action.budgetPercent` por passo + `action.steps`, 2–10) — mais seguro pra não tirar a campanha
da fase de aprendizado do Meta. Template "Escalar vencedores aos poucos".

**State tracking sem migration nova**: reusa o padrão já estabelecido pelo gatilho de horário —
o progresso (quantos incrementos já rodaram) fica só no histórico de `Alert.metricKey`
(`"scale:step:N"`) desta regra+campanha. A cada disparo, o motor lê o Alert mais recente com
`metricKey LIKE 'scale:step:%'` pra essa combinação de regra+campanha (`Like` do TypeORM) e
decide: se `N >= steps` configurado, a escalada já terminou (não faz nada); se o último passo
foi **hoje**, espera o próximo dia (no máximo 1 incremento/dia, mesmo com vários syncs no dia);
senão aplica o passo `N+1`. Em modo `approval`, antes de enfileirar uma nova pendência checa se
já existe uma `pending` do mesmo tipo pra essa regra+campanha (evita empilhar duplicatas
enquanto a última não é resolvida) — e o contador só avança de verdade quando a pendência é
**aprovada** (o handler de aprovação recalcula `N+1` do zero, com a mesma query).

Respeita `executionMode` normalmente (auto/alert/approval), diferente de `notify_email`/
`alert_only` — faz sentido pedir aprovação por incremento.

## Histórico de mudanças relevantes
- 2026-07-01 (f): Ação `scale_gradual` (regra de métrica) — escalonamento de orçamento em N
  passos diários, progresso rastreado via `Alert.metricKey` (`scale:step:N`), sem migration nova.
  Template "Escalar vencedores aos poucos".
- 2026-07-01 (e): Ação `notify_email` (regra de métrica) — envia e-mail via Resend
  (`sendReportEmail`) além do Alert interno; não respeita `executionMode` (como `alert_only`).
- 2026-07-01 (d): Ação `reactivate_campaign` (regra de métrica, fora do contexto de agenda) +
  template "Reativar campanha lucrativa".
- 2026-07-01 (c): Modos de execução (`alert`/`approval`/`auto`) + fila de aprovação
  (`AutomationPendingAction`) + tier por plano (`PlanLimits.automationTier`, migration
  `0060-AutomationExecutionModes`). Gateado: Free/Basic=1, Advanced=2, Agency=3 (reservado),
  Master=4 (reservado). Rebaixar tier nunca quebra regra — motor força `auto` abaixo de 2.
- 2026-07-01 (b): Simulação/backtest de 30 dias no passo de Revisão (`simulateRule` +
  `POST /api/automation/rules/simulate` + `AutomationRuleSimulationCard`); fix de escopo
  cross-tenant no motor (`accountsForRule`). Doc estratégico criado em `docs/orion-engine/`.
- 2026-07-01: Gatilho de horário (`kind: "schedule"`) — template "Pausar fora do horário" habilitado,
  novo motor `runScheduleAutomations` + cron `/api/cron/automation-schedule` (hora em hora), reativação
  segura via `Alert.metricKey`. Ver seção "Gatilho de horário" acima.
- 2026-06-30: Tela virou **lista + modal de escolha + stepper** (primeira aplicação do
  [padrão de fluxo de criação](../creation-flow-pattern.md)). Removidos hero/passos/templates inline.
  Novos: `AutomationCreateModeModal`, rota `/automations/rules/new` (`AutomationRuleCreatorView` +
  `steps/`), `src/lib/automation/rule-templates.ts`. Backend/motor inalterados.
- 2026-06-24: Header conformado ao `PageToolbar`; documentação criada (motor já era funcional).
