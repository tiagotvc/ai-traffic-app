# Orion Commander — a interface de IA do ecossistema

> **Commander é a camada que fala com o usuário.** No mapa do ecossistema Orion:
> **Brain** = memória (aprendizados, hipóteses, DNA) · **Engine** = executor (automações,
> ações, decisões) · **Labs** = cientistas (pesquisa) · **Commander** = IA de interface
> (orquestra os outros três e conversa com o usuário).
>
> Fonte de verdade desta feature. Complementa [docs/copilot/](../copilot/README.md)
> (detalhe do pipeline de Scientists — nome antigo da metade "research") e
> [docs/orion-engine/](../orion-engine/README.md) (fronteiras entre módulos).

## Estado atual (auditoria 2026-07-02)

O Commander de hoje é um **centro de comando contextual no criador de campanha**: valida o
rascunho localmente, orquestra os Scientists (Labs) em tempo real via SSE e exibe pipeline +
insights + próxima ação na sidebar. **Ainda não é conversacional** — o chat é casca (ver gaps).

### O que existe (por camada)

| Camada | Arquivo | O que faz |
|---|---|---|
| Serviço | [`src/lib/commander/commander-service.ts`](../../src/lib/commander/commander-service.ts) | `analyzeCampaignDraft()`: 5 checks locais (conta, campanha, público, mídia, orçamento) → pipeline de 6 passos + insights + `confidence` + `nextAction`. Sem IA, sem banco — puro estado do rascunho. |
| Tipos | [`src/lib/commander/types.ts`](../../src/lib/commander/types.ts) | `CommanderState/Insight/PipelineStep/NextAction` — o contrato que a UI consome. `CommanderInsight` já tem `evidence`/`sources`/`confidence` (pronto pra dados reais). |
| Acesso | [`src/lib/commander/access.ts`](../../src/lib/commander/access.ts) + [`access.test.ts`](../../src/lib/commander/access.test.ts) | `canUseCommander()` = env kill-switch (`ENABLE_COMMANDER !== "false"`) **E** flag de plataforma **E** plano (`allowCommander`, com free/basic/basic-plus barrados por slug) **OU** platform admin. Tem teste vitest. |
| Flags | [`registry.ts`](../../src/lib/feature-flags/registry.ts) → `campaigns.commander` | Subárvore nova: `.memory` (benchmarks/histórico) + `.scientists.*` (toda a árvore que era o módulo `copilot`). Aliases migram `copilot.*` e `scientists.*` salvos sem migration. |
| Billing | `PlanLimits.allowCommander` + migration [`0061-CommanderPlanAccess`](../../src/db/migrations/0061-CommanderPlanAccess.ts) | Boolean por plano (Advanced+ = true), backfill idempotente no JSONB de `plans`. Mapeado em `PLATFORM_MASKED_LIMITS` → flag `campaigns.commander`. |
| API de flags | [`/api/campaign-creator/flags`](../../src/app/api/campaign-creator/flags/route.ts) | Devolve `commander` (gate composto) e `commanderMemory` pro client. |
| Hooks | [`useCommanderAccess`](../../src/hooks/useCommanderAccess.ts) (fail-closed) + [`useCommanderScientistsAccess`](../../src/hooks/useCommanderScientistsAccess.ts) | O 1º decide se a sidebar vira Commander ou mantém o resumo legado; o 2º decide se o Commander pode rodar Scientists (plano `allowCopilot` + flag). |
| Estado | [`useCommanderState`](../../src/components/campaign-creator/commander/useCommanderState.ts) | Junta análise local (debounce 250ms) + stream SSE de `/api/labs/pipeline/stream` (escopo `campaign`); converte o `ResearchDossier` em `CommanderInsight[]` (top 4 sugestões, com evidência e fonte). Aborta o stream ao trocar de contexto. |
| UI | [`OrionCommanderPanel`](../../src/components/campaign-creator/commander/OrionCommanderPanel.tsx) (desktop) + `OrionCommanderMobile` + `CommanderParts` | Badge de confiança, campo "Pergunte ao Commander", pipeline ao vivo, insights, próxima ação. Plugado em `CampaignCreatorUxSidebar` — quando off, **restaura o resumo legado** (rollback seguro por flag). |
| Dados (futuro) | [`src/lib/analytics/bigquery-service.ts`](../../src/lib/analytics/bigquery-service.ts) | **Stub**: `ENABLE_BIGQUERY_ANALYTICS` + 5 métodos (`fetchCampaignMetrics`…) que retornam `[]`. Sem client GCP, sem credenciais, sem sync. Ponto de injeção futuro pra camada de memória/benchmarks. |

### O que o Codex acertou

1. **Rollback por flag em todas as camadas** — desligar `campaigns.commander` (ou o env, ou o
   plano) restaura a experiência anterior sem deploy. Fail-closed no client, teste no gate.
2. **Migração de flags por alias** — `copilot.*`/`scientists.*` viram `campaigns.commander.scientists.*`
   sem migration de banco e sem quebrar overrides salvos.
3. **Contrato de insight já dimensionado pro futuro** — `evidence`/`sources`/`confidence` no tipo,
   mesmo com a fonte atual sendo só regras locais + dossiê dos Scientists.
4. **Streaming real dos Scientists** — o painel mostra cada cientista começando/terminando com
   contagem de achados; o dossiê vira insights com evidência. Labs→Commander funciona.
5. **Backfill idempotente** de `allowCommander` (não sobrescreve valor já definido no plano).

## Gaps encontrados (priorizados)

### 🔴 P0 — prometido mas não conectado
1. ✅ **Chat é casca — RESOLVIDO (2026-07-02).** Agora existe o chat real:
   [`POST /api/commander/ask`](../../src/app/api/commander/ask/route.ts) (mesmo gate composto
   do flags route + créditos de IA `kind: "chat"` como o chat do Brain) →
   [`askCommander()`](../../src/lib/commander/ask.ts) monta o prompt com **rascunho (resumo
   compacto) + top 6 insights dos Scientists da sessão + memória do Brain** (métricas reais de
   7 dias via `getClientCampaignMetrics`, só quando `campaigns.commander.memory` está on) e
   chama **Claude com fallback Gemini**. No painel, [`useAskCommander`](../../src/components/campaign-creator/commander/useAskCommander.ts)
   liga o form (loading, erro, resposta inline; desabilitado sem cliente selecionado). O stub
   `commanderService.askCommander()` foi removido. Isso também **liga parcialmente o gap #2**:
   a flag `.memory` agora tem um consumidor real (o contexto do chat).
2. ✅ **`campaigns.commander.memory` ligada no painel — RESOLVIDO (2026-07-02).** Nova rota
   [`GET /api/commander/memory`](../../src/app/api/commander/memory/route.ts) (mesmo gate
   composto do `flags`/`ask`) devolve as top-5 campanhas reais dos últimos 7 dias; hook
   [`useCommanderMemory`](../../src/hooks/useCommanderMemory.ts) + componente
   `CommanderMemorySummary` (em `CommanderParts.tsx`) exibem no painel desktop e no nível
   expandido do dock mobile, só quando `useCommanderAccess().memory` é true.
3. ✅ **Insights locais reativados — RESOLVIDO (2026-07-02).** `useCommanderState` agora usa
   `localState.insights` no ramo sem Scientists em vez de zerar. Os 4 insights do
   `CommanderService` (orçamento, criativo, persona, benchmark) voltaram a aparecer quando
   não há Scientists rodando.

### 🟠 P1 — duplicações que vão apodrecer
4. **`allowCopilot` + `allowCommander` coexistem** com semânticas sobrepostas (Scientists vs
   shell do Commander). O comentário no hook já admite: "nome legado no contrato persistido".
   Decidir: renomear `allowCopilot → allowCommanderScientists` (com resolve tolerante no
   `resolveLimits`) ou documentar a distinção de vez.
5. **Hooks quase idênticos**: `useCopilotAccess` e `useCommanderScientistsAccess` são o mesmo
   código com nome diferente. Matar um.
6. ✅ **Gate por slug hardcoded — RESOLVIDO (2026-07-02).** `canUseCommander` removeu a lista
   `["free","basic","basic-plus"]`; o gate agora é só env + flag de plataforma + admin +
   `allowCommander` (verificado que `resolveLimits` sempre resolve `allowCommander` pra
   `false` por padrão — fail-closed, nunca fail-open). `useCopilotAccess` (re-export
   duplicado de `useCommanderScientistsAccess`) também foi removido.
7. **Dois mecanismos de tier**: Commander usa boolean (`allowCommander`), o Engine usa numérico
   (`automationTier` 1–4). Para o ecossistema inteiro (v1–v4 por plano), o padrão numérico +
   fallback seguro no runtime é o que escala — considerar `commanderTier` na Fase 2.

### 🟡 P2 — arquitetura/dados
8. **BigQuery stub sem plano.** Decisão registrada (2026-07-02): **Postgres continua fonte de
   verdade**; BigQuery só entra como export analítico read-only quando houver dor real de
   agregação/escala — e aí pluga primeiro na camada de memória (`metrics-input.ts` /
   `bigquery-service.ts`), não substitui o operacional.
9. **Naming em transição**: docs/copilot ainda diz "Copilot", a tabela de comparação diz
   "Commander — Scientists", o painel diz "Copiloto estratégico". Padronizar cópia: **Commander**
   é o produto; **Scientists** é a capacidade de pesquisa dele.

## Acoplamento do ecossistema — estado das arestas

```
            ┌────────── Commander (interface, fala com o usuário) ──────────┐
            │  pergunta/aciona           exibe/aprova            conversa   │
            ▼                            ▼                                  │
   Labs (cientistas) ──descobre──▶ Brain (memória) ──propõe──▶ Engine (executa)
            ▲                            ▲                          │
            └────── contexto ────────────┴──── log de execução ─────┘
```

| Aresta | Estado | Onde |
|---|---|---|
| Labs → Commander (dossiê ao vivo) | ✅ funciona | `useCommanderState` + `/api/labs/pipeline/stream` |
| Labs → Brain (hipóteses) | ✅ funciona | testing-skill persiste `ClientHypothesis` (SUGGESTED) |
| Brain → Commander (memória/benchmarks) | ✅ funciona | memória no contexto do chat + `CommanderMemorySummary` no painel/dock |
| Commander ↔ usuário (chat) | ✅ funciona (2026-07-02) | `/api/commander/ask` + `useAskCommander` |
| Brain → Engine (regras sugeridas) | 🔴 não existe | Fase 2 do Engine ([doc](../orion-engine/README.md)) |
| Commander → Engine (criar regra por conversa) | 🔴 não existe | depende do chat (#1) — o payload de regra já é estruturado, alvo perfeito de tool-use |
| Engine → Brain (execuções viram aprendizado) | 🔴 não existe | Alerts de `source="automation"` já são a matéria-prima |

**Regra de ouro (do doc do Engine, agora com nomes atualizados):** módulos se comunicam por
**artefatos** (dossiê, aprendizado, proposta de regra, log de execução), nunca por chamadas
síncronas entre si. O Commander é o único que conversa com o usuário; Brain não executa;
Engine não decide o que vale a pena; Labs não toca campanha real.

## Roadmap sugerido

1. **Fase A — fechar o que foi prometido** (gaps 1–3): rota `ask` com LLM + contexto, ligar
   `.memory` no painel (benchmarks reais via `metrics-input`), reexibir/remover insights locais.
2. **Fase B — limpar duplicações** (gaps 4–7): um hook, um limit, gate sem slug hardcoded.
3. **Fase C — fechar o loop do ecossistema**: Commander→Engine ("crie uma regra que…" vira
   payload de `POST /api/automation/rules` com simulação anexada) e Engine→Brain (digest de
   execuções vira aprendizado). Aí o ciclo Labs→Brain→Commander→Engine→Brain fecha.
4. **BigQuery**: só na dor. Quando entrar: job de export (Postgres→BQ), implementação real do
   `bigquery-service.ts`, e a memória do Commander passa a consultar BQ pra agregados longos.

## Histórico
- 2026-07-02 (c): **Fase A fechada + parte da Fase B** (gaps #2, #3, #6): memória do Brain
  agora aparece no painel/dock (`GET /api/commander/memory` + `useCommanderMemory` +
  `CommanderMemorySummary`), insights locais voltaram a aparecer sem Scientists (gap #3),
  gate de plano deixou de depender de lista de slug hardcoded — só `allowCommander`
  (gap #6), e `useCopilotAccess` (hook duplicado) foi removido. Também novo: aviso
  não-bloqueante "não recomendamos avançar ainda" no painel/dock (baseado em
  `state.status === "warning"`, sem tocar `goNext`/navegação) e checklist inteligente na
  etapa de revisão (`CommanderReviewChecklist`, estritamente local/síncrono — sem abrir um
  segundo stream SSE de Scientists).
- 2026-07-02 (b): **Chat real entregue** (gap #1): `POST /api/commander/ask` (gate composto +
  créditos `kind: "chat"`) → `askCommander()` com contexto rascunho + Scientists + memória do
  Brain (gateada por `.memory`), Claude→Gemini. Painel ligado via `useAskCommander` (loading/
  erro/resposta inline). Stub `commanderService.askCommander` removido. Gap #2 virou parcial.
- 2026-07-02: Documento criado (auditoria do que o Codex construiu). Mapa do ecossistema
  Brain/Engine/Commander/Labs formalizado com estado de cada aresta; gaps P0–P2; decisão
  BigQuery = export analítico futuro, Postgres segue fonte de verdade.
