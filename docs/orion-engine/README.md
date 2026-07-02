# Orion Engine — Visão estratégica e análise competitiva

> Documento estratégico da evolução do módulo **Automações** para o **Orion Engine**:
> o executor operacional do ecossistema Orion (Brain + Commander + Labs + Engine).
> Análise competitiva verificada em 2026-07-01 (fontes citadas inline).
> Doc operacional da feature atual: [`docs/automacoes/README.md`](../automacoes/README.md).

## Tese

O Orion Engine não automatiza campanhas — **automatiza trabalho**. Enquanto concorrentes
vendem dashboards e regras isoladas, o Engine é o braço executor de um ecossistema que
aprende (Brain), pesquisa (Labs) e conversa (Commander). O gestor de tráfego deixa de ser
operador e vira supervisor.

```
Labs descobre → Brain aprende → Commander recomenda → Engine executa
```

---

## 1. Análise competitiva (verificada 2026)

### Madgicx

- **Posicionamento:** "Agentic Meta Ads Management AI Platform" — e-commerce/DTC e agências pequenas/médias.
- **Automação:** AI Marketer audita a conta a cada 24h e gera recomendações que o usuário aprova com 1 clique (human-in-the-loop no formato recomendação→aprovação, não fila de aprovação de regras). Automation Tactics = templates de regras. Execução **Meta-only** (Google/TikTok só em relatórios).
- **Preço:** por ad spend, a partir de ~US$ 99/mês (madgicx.com/pricing).
- **Fraquezas (G2/Capterra):** curva de aprendizado íngreme, problemas de cancelamento/cobrança.
- **Não tem:** backtesting, criação de regras por linguagem natural (não verificada), multicanal de execução.

### Revealbot → Bïrch (rebrand 2024)

- **Posicionamento:** automação por regras para media buyers de performance; o **rule builder mais profundo do mercado**.
- **Automação:** multi-condição com agrupamento aninhado E/OU, métrica-vs-métrica em janelas distintas, timeframes customizados, ranking conditions, 20+ ações, execução a cada 15 min. "Strategies" = templates curados pelo vendor (não é marketplace comunitário). Meta, Google, TikTok, Snapchat.
- **Preço:** por ad spend — Pro US$ 99/mês até $10K, US$ 179 ($10K–$100K), US$ 299 ($100K–$500K) (bir.ch/pricing).
- **Fraquezas:** caro para agências, bugs em lançamento de criativos, UI difícil.
- **Não tem:** approval workflow (regras executam direto), backtesting, IA/copiloto (a página de features não menciona IA), aprendizado persistente.

### Optmyzr

- **Posicionamento:** PPC search-first (Google/Microsoft/Amazon) para agências e times in-house; 50K+ profissionais.
- **Automação:** Rule Engine if-then sem código; **Workouts** = rotinas guiadas de otimização (o mais próximo de "rotina operacional" do mercado). **Approval workflow é a arquitetura central** ("sugestão → revisão humana → aplicar"). **Sidekick** (2025/26): copiloto que cria regras a partir de linguagem natural.
- **Preço:** Essentials ~US$ 209/mês, Premium ~US$ 389+/mês (anual).
- **Fraquezas:** curva de semanas/meses, caro para contas pequenas, Meta é cidadão de segunda classe, **sem TikTok**.
- **Não tem:** backtesting, memória/aprendizado persistente, research lab.

### Marin Software — fora do jogo

Cronologia verificada (SEC/press releases): plano de dissolução (abr/2025) → delisting da
Nasdaq (jul/2025) → **Chapter 11** pré-negociado (jul/2025) → emerge com ações canceladas
(set/2025) → "adquirida pela Zax Capital" (site atual, roadmap não verificável).
Concorrentes chegaram a divulgar migração de clientes ("Marin is shutting down").
**Deixou de ser um concorrente relevante** — mas é um alerta: plataforma enterprise
multicanal sem diferencial defensável morre por compressão de margem.

---

## 2. Lacunas de mercado (o que NENHUM dos 4 tem)

| # | Lacuna | Status no Orion |
|---|---|---|
| 1 | **Backtesting/simulação de regras** ("essa regra teria economizado R$ X") | ✅ **Protótipo entregue** (2026-07-01) — ver §5 |
| 2 | **Marketplace comunitário** de playbooks (todos têm só templates do vendor) | Visão (fase 4) |
| 3 | **Ecossistema integrado** memória + copiloto + lab + executor | Em construção (Brain/Commander/Labs já existem no app) |
| 4 | **Rotinas operacionais além de campanhas** (revisão diária, compliance pré-publicação) | Visão (fase 3) |
| 5 | **Múltiplos agentes especialistas** nomeados (Madgicx e Optmyzr têm 1 agente genérico cada) | Visão (fase 4) |

**Lacunas já fechadas por alguém (NÃO são diferencial):** criação de regra por linguagem
natural (Optmyzr Sidekick), aprovação human-in-the-loop (Optmyzr é referência), templates
de automação (todos), multi-condição aninhada (Bïrch é o benchmark — nosso modelo `groups`
DNF já cobre o essencial).

## 3. Diferenciais defensáveis (em ordem de defensabilidade)

1. **O loop Brain→Engine.** Regras sugeridas a partir do que o Brain aprendeu com as
   campanhas do próprio tenant. Concorrentes têm regras genéricas; nós teríamos regras
   nascidas dos dados da conta. Defensável porque exige a camada de memória que nenhum
   deles construiu — e porque melhora com o uso (data moat por tenant).
2. **Simulação como porta de entrada de confiança.** Backtest antes de ativar remove o
   maior bloqueio de adoção de automação ("e se ela pausar a campanha errada?"). Único no
   mercado hoje; combinado com aprovação humana, cria uma "escada de confiança":
   simular → avisar → aprovar → automático.
3. **Mercado BR-first.** Preço em R$, PIX (já temos PIX automático no billing), suporte e
   templates em pt-BR, feriados/horário comercial BR (o gatilho de agenda já usa
   America/Sao_Paulo). Os 4 concorrentes são dólar-first — para o gestor BR de pequeno/médio
   porte, US$ 99–389/mês é proibitivo.
4. **Rotinas operacionais.** Automatizar o processo (revisão diária, checklist de
   publicação), não só a campanha. Optmyzr Workouts é o único análogo distante.
5. **Aprovação humana** — necessário mas não suficiente (Optmyzr já tem). É requisito de
   paridade para as ações destrutivas, não diferencial de marketing.

## 4. MVP vs visão de longo prazo

### Já existe (base do Engine hoje)

- Regras multi-condição DNF (`groups`: E dentro do grupo, OU entre grupos), 6 métricas,
  escopo por cliente, limite por plano.
- Ações: pausar, alertar, ajustar orçamento %, pausar/reativar por horário
  (`schedule_toggle` + cron horário).
- Logs de execução derivados de `Alert`s; **simulação/backtest de 30 dias (protótipo §5)**.

### Fase 1 — MVP Engine (semanas)

Fecha o "nível 1 + 2" da visão com os diferenciais de confiança:

- [x] Gatilho de agenda (entregue 2026-07-01).
- [x] Simulação/backtest no criador de regra (protótipo 2026-07-01).
- [x] **Modos de execução por regra** (entregue 2026-07-01): `alert`/`approval`/`auto` +
      `AutomationPendingAction` + fila de aprovação na lista, gateado por `automationTier >= 2`.
- [x] Ações **reativar campanha**, **notificar por e-mail** e **escalar gradual** (2026-07-01).
- [ ] Aba "Execuções" na regra (os `Alert`s de `source="automation"` já têm o histórico).

### Fase 2 — Playbooks + IA (1–2 meses)

- [ ] **Playbooks** (nível 3): coleção nomeada de regras ativável em bloco. Modelagem leve:
      entidade `Playbook` + `playbookId` nas regras — sem motor novo.
- [ ] **Criação por linguagem natural** (paridade com Optmyzr Sidekick): texto → IA →
      payload de regra pré-preenchendo o stepper. Reusa os orchestrators de IA existentes;
      o payload estruturado (`condition`/`action`) já é o alvo perfeito para tool-use.
- [ ] **Regras sugeridas pelo Brain**: o brain-pipeline já roda a cada sync; propor regras
      a partir de padrões detectados, com simulação anexada ("teria economizado R$ X").

### Fase 3 — Workflows + Rotinas (3–6 meses)

- [ ] Workflows multi-etapas (nível 4) com aprovação no meio do fluxo.
- [ ] Rotinas operacionais (revisão diária/semanal agendada gerando resumo).
- [ ] Compliance pré-publicação (checklist bloqueante no campaign creator).
- [ ] Dashboard do Engine (economia gerada, tempo economizado, aprovações pendentes).

### Fase 4 — Agentes + Marketplace (6–12+ meses)

- [ ] Especialistas (CPA, ROAS, Criativos, Públicos, Conversão) — agentes de monitoramento
      contínuo por cima de Brain + Engine.
- [ ] Marketplace de playbooks (compartilhar → depois vender).
- [ ] Multicanal: Google Ads primeiro (maior TAM), depois TikTok. LinkedIn/apps só com demanda.

## 5. Protótipo entregue: Simulação/backtest (2026-07-01)

Primeira lacuna de mercado fechada. Implementação:

| Peça | Arquivo |
|---|---|
| Motor de simulação (read-only) | [`src/lib/automation/simulate.ts`](../../src/lib/automation/simulate.ts) |
| API | [`POST /api/automation/rules/simulate`](../../src/app/api/automation/rules/simulate/route.ts) |
| UI (passo Revisão do stepper) | [`AutomationRuleSimulationCard`](../../src/components/automations/AutomationRuleSimulationCard.tsx) |

Como funciona: replay dos últimos 30 dias sobre os `CampaignMetricSnapshot` existentes.
Para cada dia, avalia a condição sobre a janela móvel de 7 dias anteriores — **a mesma
agregação e a mesma normalização (`normalizeConditionGroups`) do motor real**, então a
simulação nunca diverge do que o motor faria. Saídas: campanhas que teriam disparado (com
primeiro dia), gasto evitado (pausa), acréscimo diário de orçamento (ajuste %), dias-alerta.
Regras de agenda não são simuláveis (snapshots são diários, sem granularidade por hora).

Limitações honestas do modelo: assume que pausar não muda o comportamento dos dias
seguintes (o "gasto evitado" é o gasto real observado após o 1º disparo) e não modela
reativação. É um estimador conservador e explicável — suficiente para gerar confiança.

## 6. Riscos de complexidade

1. **O motor não tem testes.** Antes da Fase 1 (modos de execução), criar testes de
   unidade para `normalizeConditionGroups`, avaliação DNF e simulação. A simulação ajuda
   aqui: é um harness natural para validar o motor com dados sintéticos.
2. **Explosão de superfície do rule builder.** Bïrch mostra o teto: builder poderoso =
   UI difícil = churn. Estratégia: templates e IA na frente, builder avançado atrás
   ("progressive disclosure"). Nunca expor o DNF cru como primeira experiência.
3. **Ações destrutivas em escala.** Um bug no motor pausa campanhas de todos os tenants.
   Mitigações: modos de execução (fase 1), simulação obrigatória antes de `auto`?, kill
   switch por tenant (`automationEnabled` já existe em `ClientMetaSettings`), rate limit
   de ações por regra/dia. ⚠️ Corrigido em 2026-07-01: as contas da regra agora são
   filtradas por tenant (antes, regra sem `clientId` varria `ad_accounts` inteiro).
4. **Nível 5 (agentes) é pesquisa, não produto.** Especialistas contínuos exigem custo de
   IA recorrente por tenant + infraestrutura de avaliação. Não prometer antes da Fase 3.
5. **Multicanal cedo demais.** Marin morreu sendo multicanal sem diferencial. Meta-only
   até o loop Brain→Engine estar provado; Google Ads é a segunda praça, não a décima feature.
6. **Sobreposição de módulos** — mitigada pelo contrato do §7.

## 7. Fronteiras Brain / Commander / Labs / Engine (contrato anti-sobreposição)

| Módulo | Pergunta | Pode | NÃO pode |
|---|---|---|---|
| **Brain** | "O que sabemos?" | Aprender, consolidar padrões, emitir *insights* e *propostas de regra* | Executar ações; falar com o usuário diretamente |
| **Commander** | "O que devo fazer?" | Conversar, explicar decisões, **traduzir linguagem natural em payloads de regra/playbook** | Executar ações; guardar conhecimento próprio (lê do Brain) |
| **Labs** | "O que pode funcionar?" | Rodar pesquisas/simulações/experimentos; publicar aprendizados no Brain | Tocar campanhas reais; criar regras diretamente |
| **Engine** | "Quem faz?" | Executar regras/playbooks/workflows; manter fila de aprovação; registrar auditoria | Decidir *o que* vale a pena (recebe propostas prontas); conversar com o usuário |

Regra de ouro da integração: **os módulos se comunicam por artefatos, não por chamadas
diretas** — Labs publica *aprendizado*, Brain publica *proposta de regra* (payload igual ao
do `POST /api/automation/rules` + simulação anexada), Commander publica *payload de regra*,
Engine publica *log de execução* (que realimenta o Brain). Qualquer feature que precise de
dois módulos "conversando" síncrono é sinal de fronteira errada.

## Histórico

- 2026-07-01: Documento criado. Pesquisa competitiva (Madgicx, Bïrch, Optmyzr, Marin)
  verificada com fontes. Protótipo de simulação/backtest entregue (§5). Fix de escopo
  cross-tenant no motor (§6.3).
