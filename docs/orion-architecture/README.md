# Arquitetura Orion — Engine · Laboratory · Commander · Brain

> Análise arquitetural (2026-07-02) da reorganização dos módulos internos para a nova
> estrutura macro. **Sem mudanças visuais** — este doc define o alvo interno, o que já
> existe, o que refatorar e a ordem segura de migração.
>
> Tese: o Orion deixou de ser um "gerenciador de anúncios" e caminha para uma
> **plataforma de inteligência operacional para mídia paga**. A divisão em quatro módulos
> existe para impedir que tudo vire um monólito de inteligência impossível de manter.
>
> Docs irmãos: [orion-engine](../orion-engine/README.md) (visão competitiva + fases),
> [commander](../commander/README.md) (auditoria + arestas do ecossistema).

## 0. A mudança conceitual (importante ler primeiro)

O mapa anterior era: Brain = memória · Engine = executor · Commander = IA de interface ·
Labs = cientistas. O novo mapa **muda duas responsabilidades**:

1. **Scientists saem do "Labs" e vão para o Commander** — o Commander deixa de ser só a
   interface e vira o **coordenador da inteligência** (Parameters, Researcher, Scientists,
   Pipelines). Conversar com o usuário continua sendo dele: a conversa é a superfície de
   coordenação.
2. **Laboratory** fica com a **geração de conhecimento** (Learnings, Hypotheses,
   Experiments) — o que hoje está espalhado dentro de `src/lib/agency-brain` (geração) e
   `src/lib/labs` (experimentos).
3. **Brain** vira o **repositório central de conhecimento** (Memory, Intelligence,
   Benchmarking, Knowledge Graph) — consolida, não gera.

Frase-guia por módulo:

| Módulo | Pergunta | Verbo |
|---|---|---|
| **Engine** | "Quem faz?" | executa |
| **Laboratory** | "O que pode funcionar?" | gera conhecimento candidato |
| **Commander** | "O que devo fazer agora?" | coordena e decide |
| **Brain** | "O que sabemos?" | guarda e consolida |

A **regra de ouro se mantém**: módulos se comunicam por **artefatos persistidos**
(proposta, aprendizado, dossiê, log de execução), nunca por chamadas síncronas entre si.
Ela é o que torna essa reorganização possível sem reescrever nada de uma vez.

---

## 1. O que já existe e onde cai no novo mapa

### Orion Engine (execução) — o módulo mais pronto

| Submódulo alvo | O que já existe | Estado |
|---|---|---|
| **Rules** | `AutomationRule` (DNF `groups`), `automation-engine.ts`, simulação/backtest (`simulate.ts`), modos `alert/approval/auto`, `AutomationPendingAction` (fila de aprovação), log de execução via `Alert.automationRuleId`, aba Execuções | ✅ maduro |
| **Automations** | Ajuste de orçamento/escala gradual (ações de regra), relatórios agendados (`ReportSchedule` + cron), aplicação na Meta (`AuditLog` kind `META_APPLY`/`META_CREATE_CAMPAIGN`), propostas executáveis do chat (`chat/proposals/execute`) | 🟡 existe, mas **espalhado em 4 executores** (ver §2.1) |
| **Workflows** | `ClientActionPlan`/`ClientActionPlanItem` (embrião de plano multi-item), aprovação humana já resolvida na fila de pendências | 🔴 não existe como motor; modelar novo |

### Orion Laboratory (geração de conhecimento)

| Submódulo alvo | O que já existe | Estado |
|---|---|---|
| **Learnings** | `ClientLearning` (dedupe, status SUGGESTED→APPROVED), `learning-rules.ts` (regras determinísticas), `learning-suggestion-service`, fadiga criativa, aprendizados de automação (aresta Engine→Brain) | ✅ maduro (vive sob o namespace errado, `agency-brain`) |
| **Hypotheses** | `ClientHypothesis` (dedupe, promote/reject/confirm), `hypothesis-generator/rules/service`, persistência das hipóteses do Testing Scientist | ✅ maduro |
| **Experiments** | **Três modelagens paralelas**: (a) Testing Scientist = simulação interna por IA (read-only); (b) `labs_experiments`+`labs_agent_runs` = pesquisa assíncrona via scientists-worker/Inngest; (c) `ClientExperiment` = A/B real com forecast vs. actuals | 🟡 tudo existe, mas **fragmentado em 3 modelos** (ver §2.2) |
| **Knowledge Base** | Não existe como entidade própria — os candidatos (DNA, market memory) pertencem ao Brain | ⚪ adiar (o Brain cobre) |

### Orion Commander (coordenação da inteligência)

| Submódulo alvo | O que já existe | Estado |
|---|---|---|
| **Parameters** | `ClientGoal`/`CampaignGoal` + `goal-types.ts` (`mergeGoals`: maxCpa, maxCpl, minRoas, minCtr…), `adaptive-thresholds.ts`, `RankingConfig`, presets, `TenantAiPolicy` | 🟡 existe, espalhado em 5 lugares sem leitura unificada (ver §2.3) |
| **Researcher** | Não existe como agente separado. As capacidades de busca vivem **dentro** dos scientists (searchapi no competitor-skill, Meta Ad Library no market-memory-service) | 🔴 extrair (ver §4) |
| **Scientists** | Duas famílias intencionais: skills in-app (`labs/skills/`: competitor, geo, testing) e worker externo (`SCIENTISTS_WORKER_URL`: competitor, consumer, trend, hypothesis, confidence) | ✅ maduro; só muda de dono conceitual |
| **Pipelines** | `labs/pipelines/runner.ts` (paralelo + Testing sequencial no fim, SSE, escopo por passo do wizard, cap de slots por plano), dossiê consolidado (`ResearchDossier`) | ✅ maduro — é o embrião do pipeline macro |
| **Decisão/Interface** | Chat contextual (`askCommander` com rascunho+Scientists+memória), proposta de regra com simulação (Commander→Engine), checklist/aviso no criador | ✅ entregue na Fase C |

### Orion Brain (conhecimento central)

| Submódulo alvo | O que já existe | Estado |
|---|---|---|
| **Memory** | `ClientDna` (buckets works/doesntWork por dimensão, 1 linha por cliente), `ClientTimelineEvent` (timeline tipada), snapshots de métricas (3 tabelas diárias) | ✅ per-cliente; falta visão central |
| **Intelligence** | `get-client-brain-context.ts` (contexto consolidado p/ chat), `brain-summary-service`, `MarketMemory` (padrões da Ad Library, TTL 72h) | 🟡 existe como leitura, não como camada |
| **Benchmarking** | `niche-insights.ts` — único mecanismo cross-tenant real (opt-in `agencyBrainNicheShareOptIn`), agregação **em tempo de consulta**, sem tabela física | 🔴 embrião; é o caso de uso nº 1 do BigQuery (§5) |
| **Knowledge Graph** | Não existe. Os `evidence` jsonb dos learnings já linkam campanha↔criativo↔aprendizado implicitamente | ⚪ não construir agora (ver §6.4) |

**Resposta direta à pergunta "a arquitetura atual já suporta um Brain central?"**:
suporta a metade *per-cliente* (DNA, timeline, contexto) com qualidade. **Não** suporta a
metade *central* (benchmarking cross-conta, consolidação cross-tenant, grafo): não há
tabela física de benchmark, a agregação por nicho é feita on-the-fly sobre Postgres, e
isso não escala para milhares de clientes. A resposta é planejar o Brain central **agora,
como plano analítico (BigQuery)**, sem migrar o operacional (§5).

---

## 2. O que precisa ser refatorado (em ordem de dor)

### 2.1 Engine: unificar o executor (a refatoração mais importante)

Hoje **quatro caminhos distintos** executam ações na Meta ou no sistema:

1. `automation-engine.ts` (regras → pausar/ajustar/alertar)
2. `pending-actions/[id]/approve` (fila de aprovação → executa a ação pendente)
3. `agency-brain/chat/proposals/execute` (propostas do chat → scale_budget/pause)
4. Campaign creator (publicação → `META_CREATE_CAMPAIGN`)

Cada um tem seu próprio tratamento de erro, auditoria e efeito colateral. Proposta:

- **Uma tabela `engine_executions`** (evolução do que hoje é `Alert` + `AuditLog`
  costurados): `tenantId, clientId, source (rule|approval|chat|creator|workflow),
  sourceId, actionType, payload jsonb, status, result jsonb, executedAt`.
- **Um serviço `executeAction()`** que todos os quatro chamantes usam. A fila de aprovação
  vira um estado (`pending → approved → executed`) da mesma tabela em vez de entidade
  separada — `AutomationPendingAction` é absorvida.
- Ganhos: auditoria uniforme, kill-switch e rate-limit num lugar só, e a aresta
  Engine→Brain (execução → aprendizado) passa a cobrir **tudo** que o Engine faz, não só
  regras.
- **Workflows** (fase futura) viram triviais: um workflow é uma sequência de
  `engine_executions` com `workflowId` + step + gate de aprovação no meio — o motor de
  estados já existe na fila.

### 2.2 Laboratory: um agregado `Experiment`, três `kind`s

As três modelagens de experimento devem convergir para **um agregado** com
discriminador, mantendo as tabelas atuais até a migração:

```
Experiment
  kind: "simulation"   → hoje Testing Scientist (efêmero + ClientHypothesis)
  kind: "research"     → hoje labs_experiments (worker assíncrono via Inngest)
  kind: "ab_test"      → hoje ClientExperiment (A/B real, forecast vs actuals)
  status: draft → queued → running → collecting → analyzing → completed/failed
  hypothesisId?  (todo experimento idealmente nasce de uma hipótese)
  resultLearningId?  (todo experimento concluído idealmente publica um learning)
```

O elo `Hypothesis → Experiment → Learning` é o coração do Laboratory e hoje só existe
parcialmente (`ClientExperiment.hypothesisId` existe; `labs_experiments` não liga a nada).
Fechar esse elo é mais valioso que qualquer renomeação.

Nota: `labs_experiments`/`labs_agent_runs` são SQL cru fora do TypeORM — trazer para o
padrão de entidades na consolidação.

### 2.3 Commander: serviço `Parameters` unificado

Metas e limites estratégicos estão em 5 lugares (`ClientGoal`, `CampaignGoal`,
`adaptive-thresholds`, `RankingConfig`, `TenantAiPolicy`). Não é preciso fundir tabelas —
é preciso **uma leitura unificada**:

```ts
getParameters(tenantId, clientId, metaCampaignId?) → {
  goals: GoalFields          // merge client→campaign (já existe: mergeGoals)
  thresholds: AdaptiveThresholds
  ranking: RankConfig
  aiPolicy: TenantAiPolicy
  operationalLimits: { automationTier, maxScientists, ... }  // de PlanLimits
}
```

Todo consumidor de inteligência (motor de regras, signal-analyzer, scientists, chat)
passa a ler parâmetros por essa porta. Regras globais futuras ("nunca pausar campanha
com menos de 3 dias") entram aqui sem nova infra.

### 2.4 Namespaces: mover código sem big-bang

O problema de nome mais grave: **`src/lib/agency-brain` contém três módulos misturados**
(geração=Laboratory, consolidação=Brain, chat=Commander). Migração segura, por
re-export — sem mover tudo de uma vez:

```
src/lib/engine/       ← automation-engine, simulate, rule-templates, executor novo
src/lib/laboratory/   ← learning-rules, learning-suggestion-service, hypothesis-*,
                        experiment-* (3 origens), skills de geração
src/lib/commander/    ← (já existe) + labs/pipelines, labs/skills, worker-client,
                        parameters (novo), chat-agent-service
src/lib/brain/        ← dna-builder, get-client-brain-context, brain-summary,
                        market-memory, niche-insights, timeline-*, metrics-input
```

Regra prática: **código novo já nasce no namespace certo; código velho move quando for
tocado**. Cada arquivo movido deixa um re-export no caminho antigo por uma release.
Fronteira executável depois via regra de lint (`import/no-restricted-paths`): Engine não
importa de Laboratory, Brain não importa de ninguém que execute, etc.

---

## 3. Banco de dados e serviços

### 3.1 Postgres continua a fonte de verdade operacional

Um banco só, **sem** microsserviços e **sem** split físico de schema agora. A separação é
lógica: prefixo de tabela para entidades novas (`engine_executions`, `lab_experiments`,
`brain_edges`…) e disciplina de namespace nos serviços. As 78 entidades atuais não são
renomeadas — renomear tabela em produção é risco sem ganho.

### 3.2 O barramento de artefatos: `domain_events` (outbox)

A regra "módulos se comunicam por artefatos" hoje é implementada ad-hoc (Alert como log,
ClientTimelineEvent como timeline, dedupeKey como idempotência). Formalizar com **uma
tabela outbox**:

```
domain_events
  id, tenantId, clientId?, occurredAt
  module: engine|laboratory|commander|brain
  type: rule.executed | learning.approved | hypothesis.promoted |
        experiment.completed | proposal.created | parameter.changed | ...
  payload jsonb, sourceId, sourceType
  processedAt?  (por consumidor, se necessário)
```

Isso resolve três problemas de uma vez: (a) as arestas do ecossistema deixam de ser
imports acoplados entre pipelines; (b) é o **feed natural do export para BigQuery** (§5);
(c) `ClientTimelineEvent` vira uma *projeção de UI* dos domain_events em vez de segunda
fonte de verdade. O Inngest já existente é o consumidor natural para processamento
assíncrono (`inngest.send` a partir do outbox).

### 3.3 Preparação para milhares de clientes (sem grandes migrações futuras)

Onde o volume vai doer, em ordem:

1. **Snapshots de métricas** (`CampaignMetricSnapshot`, `AdMetricSnapshot`,
   `MetricSnapshot`) — crescimento diário × campanhas × anúncios. Plano:
   - Curto prazo: já têm índices compostos por dia; suficiente até ~centenas de clientes.
   - Médio prazo: **particionamento nativo por mês** (declarative partitioning) nas 3
     tabelas — as migrations do projeto já são SQL cru idempotente, então é uma migration
     normal, não uma reescrita. Fazer **antes** de 1M+ linhas/tabela.
   - Retenção: Postgres guarda a janela quente (ex.: 13 meses); o histórico completo vive
     no BigQuery. O motor de regras só olha 7–30 dias — nunca precisa do histórico frio.
2. **Regra de modelagem para tabelas novas: `tenantId` direto na tabela, sempre** — o
   inventário mostrou ~14 entidades escopadas só por FK (`clientId`/`layoutId`/…), o que
   trava sharding e row-level security futuros. Não corrigir as existentes agora; não
   criar novas assim.
3. **Jobs por tenant**: os crons hoje iteram tenants em loop (automation-schedule,
   backfill). Com milhares de tenants, mover a iteração para fan-out via Inngest (um
   evento por tenant) — o padrão já existe no `run-labs-experiment`.
4. **O que NÃO fazer**: sharding físico, schema-per-tenant, CQRS completo, filas Kafka.
   Nada no produto atual justifica; toda a preparação acima é reversível e incremental.

---

## 4. Encaixe com os cientistas que já estão sendo construídos

As **duas famílias atuais são a arquitetura certa** para o novo mapa — só mudam de dono:

| Família | Hoje | No novo mapa |
|---|---|---|
| Skills in-app (competitor, geo, testing) — síncronas, SSE, baratas | `labs/skills` | **Commander › Pipelines** (pesquisa em tempo real na conversa/criador) |
| Scientists-worker externo (competitor, consumer, trend, hypothesis, confidence) — assíncrono, Inngest, créditos | `labs/experiments` | **Laboratory › Experiments** (pesquisa profunda que gera conhecimento) |

Decisões:

- **O contrato `ResearchDossier` é o artefato Commander↔Laboratory** — não mudar. Um
  dossiê in-app pode ser promovido a experimento do Laboratory ("pesquise isso a fundo").
- **Extrair o Researcher**: a capacidade de *buscar fontes* (searchapi, Meta Ad Library,
  futuros Google/TikTok/Bing) hoje vive dentro de cada scientist. Extrair para um serviço
  `researcher/` com interface por fonte (`fetchAds(niche)`, `fetchTrends(query)`…) que os
  scientists consomem. É o que permite adicionar fonte nova sem tocar em nenhum scientist
  — e é pré-requisito honesto para o multicanal.
- **Novos especialistas** (Creative, Audience, Scaling, Funnel, CRO Scientist) entram como
  novas skills no registry existente — o runner, o cap de slots por plano e o SSE já os
  suportam sem mudança. O Testing Scientist continua sendo o agregador sequencial no fim.

## 5. BigQuery desde o início — como, sem trair o operacional

Revisão da decisão anterior ("BQ só na dor"): adotar desde o início, **mas como plano
analítico, nunca como fonte de verdade operacional**. A fronteira:

| | Postgres (operacional) | BigQuery (analítico) |
|---|---|---|
| Papel | transações, gates, filas, UI | histórico longo, agregação, benchmarking |
| Janela | 7–30 dias (motor), ~13 meses (UI) | tudo, para sempre |
| Escrita | app | **só o export job** (append-only) |
| Leitura | tudo que é síncrono | Brain: benchmarks, memória longa, relatórios pesados |

Implementação (o stub `src/lib/analytics/bigquery-service.ts` vira real):

1. **Dataset `orion_analytics`**, tabelas espelho append-only: `campaign_snapshots`,
   `ad_snapshots`, `domain_events`, `learnings`, `executions` — todas **particionadas por
   data e clusterizadas por `tenant_id`** (é o que torna milhares de clientes baratos).
2. **Export incremental** ao fim de cada sync (mesmo gancho do brain-pipeline) ou cron
   horário: lê o delta do outbox/snapshots e faz streaming insert. Idempotência por
   chave natural (`tenantId+campaignId+day`).
3. **Consumidores (todos no Brain)**: benchmarking por nicho (substitui a agregação
   on-the-fly do `niche-insights` com views BQ anonimizadas), memória longa do Commander
   ("como essa conta performava há 6 meses?"), e futuramente features para sugestão de
   regras (Brain→Engine).
4. **Nunca**: motor de regras, gates de billing, filas ou qualquer caminho de request
   lendo BQ síncrono.

Assim o BQ entra cedo (schema e export rodando desde já, histórico acumulando) sem criar
dependência operacional de um sistema eventual-consistent.

## 6. Fronteiras claras entre os quatro módulos

### 6.1 Contrato (evolução da tabela do doc do Engine)

| Módulo | Pode | NÃO pode |
|---|---|---|
| **Engine** | executar regras/automações/workflows; manter fila de aprovação; registrar `engine_executions` | decidir o que vale a pena; gerar conhecimento; falar com o usuário |
| **Laboratory** | gerar learnings/hypotheses; rodar experiments (3 kinds); publicar dossiês profundos | tocar campanha real (exceto A/B com aprovação via Engine); falar com o usuário |
| **Commander** | conversar; coordenar pipelines de scientists; ler Parameters; transformar decisão em proposta para o Engine | executar direto na Meta; guardar conhecimento próprio (lê do Brain) |
| **Brain** | consolidar (DNA, benchmarks, memória, grafo); servir contexto a todos | executar; gerar conhecimento novo (recebe do Laboratory); falar com o usuário |

### 6.2 O pipeline macro (o exemplo do usuário, mapeado no código)

```
Researcher (Commander)        → fontes: searchapi/Ad Library (hoje dentro dos scientists)
  → Scientists (Commander)    → labs/skills + scientists-worker
  → Learnings (Laboratory)    → ClientLearning (SUGGESTED)
  → Hypotheses (Laboratory)   → ClientHypothesis (SUGGESTED → promoted)
  → Experiments (Laboratory)  → Experiment kind=ab_test/research
  → Commander Decision        → chat/painel: proposta com evidência + simulação
  → Engine Execution          → executeAction() → engine_executions → domain_events
  → (volta) Brain             → learning de execução, DNA, benchmark
```

Cada seta é um **artefato persistido** — nenhuma é chamada síncrona. Hoje já funcionam:
Scientists→Hypotheses, Hypotheses→Experiments (parcial), Commander→Engine (proposta de
regra), Engine→Brain (execuções→learnings). Faltam: Researcher extraído,
Experiments→Learnings sistemático, Brain→Engine (regras sugeridas).

### 6.3 Onde cada dado mora (resumo)

- **Engine**: AutomationRule, engine_executions (novo, absorve AutomationPendingAction),
  workflows (futuro)
- **Laboratory**: ClientLearning, ClientHypothesis, Experiment (unificado),
  labs_agent_runs
- **Commander**: parameters (leitura de ClientGoal/CampaignGoal/RankingConfig/
  TenantAiPolicy), dossiês (efêmeros), histórico de chat
- **Brain**: ClientDna, MarketMemory, ClientTimelineEvent (projeção), domain_events,
  espelhos BQ (benchmark, memória longa)

### 6.4 Knowledge Graph: não construir agora

O grafo (públicos↔criativos↔campanhas↔nichos↔resultados) já existe **implícito** nos
`evidence` jsonb dos learnings e nas FKs. Quando houver consumidor real (recomendação
cross-dimensão), materializar como tabela de arestas simples no Postgres
(`brain_edges: fromType, fromId, toType, toId, relation, weight, evidence`) — **não**
adotar graph DB. Adiar até a Fase 4; registrar a decisão aqui para ninguém abrir essa
frente antes da hora.

---

## 7. Roadmap de migração (incremental, sem big-bang)

- ✅ **Fase 0 — agora (custo ~zero):** este doc como fonte de verdade; código novo nasce no
  namespace certo; regra "tenantId direto em toda tabela nova"; congelar os nomes
  (Engine/Laboratory/Commander/Brain) na comunicação interna.
- ✅ **Fase 1 — Engine unificado (entregue 2026-07-02):** `executeAction()`/`enqueueApproval()`/
  `approveExecution()` em [`src/lib/engine/executor.ts`](../../src/lib/engine/executor.ts) +
  tabela `engine_executions` (migration 0064, copia a fila antiga com ids preservados) +
  outbox `domain_events` ([`src/lib/events/domain-events.ts`](../../src/lib/events/domain-events.ts)).
  Cobertos os 4 executores: motor de regras (agenda + métricas), fila de aprovação (rotas
  `pending-actions` agora leem/escrevem `engine_executions`; `AutomationPendingAction`
  deprecada), chat (`executeActionSuggestion` registra via `recordExternalExecution`) e
  creator (`/api/meta/apply` idem). Eventos emitidos: `engine.action.executed/failed/
  pending/approved/rejected`. Os `Alert`s continuam como projeção de UI + state-tracking
  do motor (dedupe, passos de escalada, chaves de agenda) — decisão registrada no executor.
- ✅ **Fase 2 — BigQuery cedo (entregue 2026-07-02):** cliente lazy/env-gated em
  [`bigquery-client.ts`](../../src/lib/analytics/bigquery-client.ts) e export incremental
  em [`bq-export.ts`](../../src/lib/analytics/bq-export.ts) (cron horário
  `/api/cron/bq-export`). Dataset `orion_analytics` com 4 tabelas — `campaign_snapshots`
  (tenant resolvido via join, já que o snapshot é FK-scoped), `domain_events`, `learnings`,
  `executions` — todas **particionadas por dia + clusterizadas por `tenant_id`**, criadas
  automaticamente no primeiro export. Cursores: watermark de `updatedAt` por tabela em
  `platform_settings` (`bq_export_state`); `domain_events` usa o próprio outbox
  (`processedAt IS NULL`). Contrato append-only: linha atualizada re-exporta como nova
  versão, consumidor deduplica por chave natural + `updated_at` máximo. Falha em uma
  tabela não bloqueia as outras nem avança o watermark dela. Ligar em produção =
  `ENABLE_BIGQUERY_ANALYTICS=true` + `BIGQUERY_CREDENTIALS_JSON` (+ opcionais
  `BIGQUERY_PROJECT_ID`/`BIGQUERY_DATASET`/`BIGQUERY_LOCATION`, default
  `southamerica-east1`). Desligado = no-op barato. Adiado conscientemente: `ad_snapshots`
  (volume alto, exportar quando houver consumidor) e as views de dedup/benchmark (Fase 5).
- ✅ **Fase 3 — Laboratory consolidado (entregue 2026-07-03):** `labs_experiments`/
  `labs_agent_runs` viraram entities TypeORM (`LabsExperiment`/`LabsAgentRun` —
  `labs_findings`/`labs_hypotheses`/`labs_credits_usage` ficam com o scientists-worker
  externo, de propósito); migration 0065 adiciona `hypothesis_id`/`result_learning_id`
  (labs) e `resultLearningId` (client_experiments). **Elo Experiment→Learning fechado**:
  [`experiment-outcomes.ts`](../../src/lib/laboratory/experiment-outcomes.ts) publica um
  `ClientLearning` sugerido + `laboratory.experiment.completed` quando um experimento
  conclui — ganchos no Inngest (`publish-outcome` após finalize), no mock-runner e no
  `updateExperiment` (primeira vez que winner/conclusão é setado). Leitura unificada do
  agregado em [`laboratory/experiments.ts`](../../src/lib/laboratory/experiments.ts)
  (`kind: research | ab_test`; `simulation` é efêmero e persiste direto em hipóteses).
  Outbox do Laboratory ligado: `laboratory.learning.suggested` (em
  `createSuggestedLearning`) e `laboratory.hypothesis.suggested` (em
  `createHypothesisFromDraft`) — ambos já fluem pro BigQuery via export da Fase 2.
- ✅ **Fase 4 — Commander coordenador (entregue 2026-07-03):**
  [`parameters.ts`](../../src/lib/commander/parameters.ts) — `getParameters(tenantId,
  {clientId, metaCampaignId, weeklySpend})` unifica a leitura de ClientGoal/CampaignGoal
  (via `mergeGoals`), thresholds adaptativos (quando o chamador informa o gasto semanal),
  RankingConfig, TenantAiPolicy e PlanLimits — as tabelas ficam onde estão, o contrato de
  leitura é um só. Primeiro consumidor: o chat do Commander (metas do cliente entram no
  contexto e as propostas de regra nascem alinhadas a elas).
  [`researcher.ts`](../../src/lib/commander/researcher.ts) — porta única para fontes
  externas (SearchAPI SERP/Trends/YouTube/Maps com orçamento diário, Meta Ad Library com
  cache, reach estimate); o competitor-skill já consome só via Researcher — fonte nova
  (Google/TikTok/Bing) entra aqui sem tocar scientist. Namespace: `labs/pipelines` e
  `labs/skills` moveram para `commander/pipelines`/`commander/skills` com stubs de
  re-export nos caminhos antigos (zero churn nos importadores).
- ✅ **Fase 5 — Brain central (entregue 2026-07-03):** **Brain→Engine fechada — o ciclo
  completo do ecossistema está fechado.**
  [`brain/rule-suggestions.ts`](../../src/lib/brain/rule-suggestions.ts): no brain-pipeline,
  metas do cliente (Parameters) + métricas de 7d geram candidatos determinísticos (CPA acima
  da meta → pausar; gasto sem conversão → pausar; ROAS 50%+ acima do mínimo → escalar), cada
  um validado por `simulateRule` 30d — só vira proposta se teria disparado, com o impacto
  ("teria evitado R$ X") na descrição. A proposta é uma `ClientActionSuggestion`
  (`create_automation_rule`) no feed existente; executar cria a regra em **modo aprovação**
  (clamp por tier + `maxAutomationRules`, evento `engine.rule.created`). Dedupe por
  tipo+cliente e skip se já existe regra equivalente ativa.
  **Benchmarking por nicho** ([`brain/niche-benchmarks.ts`](../../src/lib/brain/niche-benchmarks.ts)):
  o cron `bq-export` (único leitor do BQ) materializa agregados de 90d por nicho em
  `platform_settings` — opt-in por tenant, mínimo 2 clientes por nicho; `niche-insights`
  agrega o benchmark quantitativo aos padrões ("CPA médio R$ X · CTR Y% · ROAS Z").
  Adiado consciente: memória longa no chat (espera histórico BQ acumular) e `brain_edges`
  (grafo — sem consumidor ainda, decisão do §6.4 mantida).

Cada fase é utilizável sozinha e nenhuma exige downtime ou migração destrutiva.

## Histórico

- 2026-07-03 (c): **Fase 5 entregue — roadmap completo.** Brain→Engine (regras sugeridas
  goal-driven com simulação anexada, via feed de sugestões, criação em modo aprovação) e
  benchmarking por nicho materializado (BQ lido só no cron, snapshot em platform_settings,
  consumido pelo niche-insights). Todas as arestas do ecossistema
  Labs→Brain→Commander→Engine→Brain estão fechadas.
- 2026-07-03 (b): **Fase 4 entregue** — Commander coordenador: `getParameters()` como
  leitura unificada dos parâmetros estratégicos (1º consumidor: contexto do chat),
  Researcher como porta única de fontes externas, pipelines/skills no namespace do
  Commander com re-exports.
- 2026-07-03: **Fase 3 entregue** — Laboratory consolidado: labs para TypeORM, elo
  Hypothesis→Experiment→Learning fechado (todo experimento concluído publica learning
  sugerido com dedupe + evento no outbox), leitura unificada do agregado com `kind`,
  eventos `laboratory.*` emitidos nos pontos centrais de criação de artefatos.
- 2026-07-02 (c): **Fase 2 entregue** — plano analítico BigQuery ligável por env:
  `@google-cloud/bigquery` adicionado, cliente lazy, schema bootstrap idempotente
  (4 tabelas particionadas/clusterizadas), export incremental com watermarks +
  outbox como cursor, cron horário. Postgres segue fonte de verdade; BQ nunca é lido
  em request síncrono (leitura só na Fase 5).
- 2026-07-02 (b): **Fase 1 entregue** — executor unificado (`src/lib/engine/executor.ts`),
  `engine_executions` absorve a fila de aprovação (migration 0064, idempotente, ids
  preservados; semântica preservada: aprovação que falha na Meta mantém a pendência
  `pending` e responde 502), outbox `domain_events` com eventos `engine.action.*`, e os
  4 chamadores (regras, fila, chat, creator) registrando no log unificado. Shape das
  respostas das rotas `pending-actions` mantido — zero mudança de UI.
- 2026-07-02: Documento criado a partir do inventário completo do código (78 entidades,
  3 modelos de experimento, 2 famílias de scientists, 6 crons + Inngest). Decisões:
  Postgres segue operacional / BQ entra já como plano analítico; executor unificado é a
  refatoração nº 1; knowledge graph adiado; migração por namespace com re-exports.
