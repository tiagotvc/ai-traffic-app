# Proposta — Criador de Persona v2 (persona + comparação com dados reais da Meta)

> Análise do criador de persona atual + proposta de evolução. **Documento de proposta — nada
> implementado.** Respeita a restrição de não mexer na lógica de criação de público/ranking sem OK.
> Captado em 2026-06-28.

## 1. Diagnóstico — o que o criador de persona faz hoje

Hoje o criador de persona é, na prática, um **montador de targeting da Meta**:

- Briefing (negócio, perfil, comportamentos, faixa/gênero) → IA gera **preview** (nome, narrativa,
  traços) → IA monta um **searchPlan** e busca na Meta (`searchAdInterests` /
  `searchAdTargetingCategories`) → devolve **segmentos Meta** (interesses + comportamentos +
  demográficos) → salva em `UserPersona.targeting` (`flexible_spec`).
- A UI [`PersonaSegmentChipList`](../../src/components/audiences/create/PersonaSegmentChipList.tsx)
  mostra/edita esses segmentos em 3 abas (Interesses / Comportamentos / Demográficos), com limites
  `20 / 16 / 10`.

**O problema que você apontou:** isso é **montar público na Meta** — interesse/comportamento/demográfico
é exatamente o conteúdo do **Criador de Públicos Meta** (outro menu). O "cursor" transformou o criador
de persona num **builder de targeting**, quando o que você pediu foi outra coisa: **buscar dados de
público na Meta e comparar com a nossa configuração de público** — ver se o comportamento faz sentido,
gerar insights. Ou seja, faltou a **camada de inteligência/comparação**, e sobrou um builder de targeting
no lugar errado.

## 2. Separação proposta (cada coisa no seu menu)

| Módulo | Papel | O que vive nele |
|---|---|---|
| **Criador de Persona** | **Quem é o público + inteligência** | Narrativa, traços, comportamento, faixa/gênero, e a **camada de comparação/insights** com dados reais da Meta. |
| **Criador de Públicos Meta** (`/audiences/meta`, hoje só Lookalike) | **Montar/editar o targeting Meta** | Os **segmentos Meta** (interesses/comportamentos/demográficos), lookalike, custom audiences, delivery estimate. É aqui que o `PersonaSegmentChipList` faz sentido. |

A persona **pode derivar** um targeting sugerido (opcional, gerado pela IA) e "empurrar" para o
Criador de Públicos — mas a **edição fina de segmentos** sai do criador de persona. Assim a persona
volta a ser sobre **estratégia/público**, e o targeting técnico fica no lugar certo.

## 3. A camada que faltava — comparação persona × dados reais da Meta

É o coração do que você pediu. **Já temos os dados** para isso (nada novo de integração pesada):

| Insight | Como (já existe) | Exemplo de saída |
|---|---|---|
| **Tamanho real da persona** | `fetchDeliveryEstimate(targeting)` | "Sua persona alcança ~1,2M pessoas no BR." |
| **Coerência demográfica** | `AudienceInsightBreakdown` (idade/gênero/região × CPA/conversões) vs `persona.ageMin/ageMax/gender` | "A persona diz 25–34, mas seus dados convertem melhor em **35–44** (CPA −28%). Considere ampliar." |
| **O comportamento faz sentido?** | IA cruza a narrativa/comportamento da persona com os interesses/comportamentos que **realmente performam** (breakdowns + criativos do Brain) | "O comportamento 'compra online' bate com seus melhores criativos; já 'fã de esportes' não aparece nos dados." |
| **Validade dos segmentos** | `validateTargetingIdList` | "3 segmentos da persona ficaram **inválidos** na Meta — substituir." |
| **Sobreposição com o público real** | segmentos da persona vs `ClientSavedTargeting` / público salvo do cliente | "70% de match com o público que já roda; falta o comportamento X." |
| **Concorrentes (opcional)** | MCP **Meta Ad Library** (+ Google/TikTok) já disponível | "Concorrentes miram ângulo Y que sua persona não cobre." |

Saída: um **score de coerência** + lista de **recomendações acionáveis** (ampliar faixa, trocar
segmento inválido, alinhar comportamento), com **explicabilidade** (qual dado embasou) — no mesmo
espírito do Agency Brain. Roteado pelo **AI router** (Gemini barato no resumo, Claude na análise).

## 4. UX proposta do Criador de Persona v2 (fases)

1. **Briefing** — quem é (negócio, perfil, comportamento, faixa/gênero). _(como hoje)_
2. **Persona (preview)** — nome, narrativa, traços. _(como hoje)_
3. **🆕 Insights & Comparação** — a tela nova: tamanho real, coerência demográfica, comportamento faz
   sentido?, validade, sobreposição com público real, recomendações. **Este é o entregável que faltava.**
4. **Targeting (opcional)** — gerar um targeting sugerido a partir da persona e **enviar ao Criador de
   Públicos Meta** (em vez de editar segmento por segmento aqui).
5. **Salvar persona** — persona + (opcional) targeting derivado.

→ O `PersonaSegmentChipList` (edição de segmentos) **migra** para o Criador de Públicos Meta.

## 5. Feature flags (ligar/desligar sem quebrar)

- `audiences.personaInsights` — liga a camada de comparação/insights (item 3). Off = criador de persona
  clássico.
- `audiences.personaTargetingBuilder` — controla se a edição de segmentos aparece no criador de persona
  (default **off** → vai pro criador de públicos) ou continua aqui (transição).
- (Os insights de IA respeitam as flags `ai.*` do router.)

## 6. Escopo / cuidado

- **Não mexer** na lógica de criação/publicação de público e ranking (constraint). A camada de
  comparação é **aditiva e read-only** (lê delivery estimate + breakdowns + validação); a separação é
  **reorganização de UI** (mover o chip-list de menu).
- A persona continua produzindo um `targeting` válido para uso downstream (campanhas) — só muda **onde**
  ele é editado.
- Implementação **só após seu OK**; dá para fasear: **Fase 1** = camada de Insights & Comparação (maior
  valor, aditiva); **Fase 2** = mover o builder de segmentos para o Criador de Públicos Meta.

## Arquivos relevantes (referência)
- Persona: [`AiPersonaForm`](../../src/components/audiences/create/AiPersonaForm.tsx),
  [`PersonaSegmentChipList`](../../src/components/audiences/create/PersonaSegmentChipList.tsx),
  [`/api/personas/ai-generate`](../../src/app/api/personas/ai-generate/route.ts),
  `UserPersona` (entidade), `audience-targeting-ai.ts`, `audience-targeting-shared.ts`.
- Dados Meta já disponíveis: `meta-graph.ts` (`fetchDeliveryEstimate`, `searchAdInterests`,
  `validateTargetingIdList`), `audience-insight-breakdowns.ts` / `AudienceInsightBreakdown`,
  `client-saved-targeting.ts` / `ClientSavedTargeting`.
- Públicos Meta: [`MetaAudiencesFeatureClient`](../../src/components/audiences/MetaAudiencesFeatureClient.tsx),
  `AudiencesLookalikeClient.tsx`.

## Cientistas (Labs) no Orion Brain — 2026-06-28

A comparação automática da persona é apresentada como o **Marketing Scientist** (cientista
`competitor` do catálogo Labs — pesquisa Meta Ad Library/TikTok/landing de concorrentes).

- **Flags por cientista** (novo): módulo `scientists` no registry de feature flags com um filho por
  cientista MVP (`scientists.competitor`/`consumer`/`trend`/`hypothesis`/`confidence`) — admin
  ativa/desativa cada um. Ver [registry](../../src/lib/feature-flags/registry.ts).
- A pesquisa automática na persona é gateada por **`audiences.personaInsights` + `scientists.competitor`**
  (exposto em [`/api/audiences/flags`](../../src/app/api/audiences/flags/route.ts) como `marketingScientist`).
- **Feedback visual** no card Orion Brain: cabeçalho com gradiente do cientista + ícone + animação
  "Pesquisando o mercado…" enquanto roda; resultado (coerência, melhor idade, segmentos inválidos,
  recomendações) abaixo. Respeita o **Pausar**. Ver [`PersonaCreatorBrainTips`](../../src/components/audiences/create/PersonaCreatorBrainTips.tsx).
- A comparação dispara **mais cedo** (já no briefing: negócio + perfil + faixa/gênero vs dados reais),
  sem exigir targeting/segmentos.
- **Validação por passo** no criador: "Próximo" só libera com os campos obrigatórios da seção
  preenchidos (`PersonaCreatorUxPage`). Lógica base do criador **não** foi alterada.

## Status

- ✅ **Insights automáticos no card "Orion Brain"** (2026-06-28): a comparação **roda sozinha** em
  background (debounce ~1,2s) conforme a persona é montada, e o resultado (coerência, melhor idade,
  segmentos inválidos, top recomendações) aparece **dentro do card Orion Brain** — não há mais o card
  "Insights & Comparação" separado em cada passo. O botão **Pausar/Retomar** do Orion Brain (estado no
  `PersonaCreatorScoreContext`, persistido) **pausa também a comparação**. Auto-fetch no
  [`AiAudienceTargetingForm`](../../src/components/audiences/create/AiAudienceTargetingForm.tsx) →
  contexto → render em [`PersonaCreatorBrainTips`](../../src/components/audiences/create/PersonaCreatorBrainTips.tsx).
  (O `PersonaInsightsPanel` segue só no `PersonaDetailPanel`, para personas já salvas.)
- ✅ **Fase 1 — Insights & Comparação (endpoint, atrás de `audiences.personaInsights`)**:
  - Endpoint [`/api/personas/insights`](../../src/app/api/personas/insights/route.ts) (GET = estado da
    flag; POST = análise **read-only**): tamanho real (`fetchDeliveryEstimate`), validade dos segmentos
    (`validateTargetingIdList`), coerência demográfica (`AudienceInsightBreakdown` por idade/gênero ×
    CPA) e **recomendações por IA** (router, com explicabilidade).
  - UI [`PersonaInsightsPanel`](../../src/components/audiences/PersonaInsightsPanel.tsx) montado no
    [`PersonaDetailPanel`](../../src/components/audiences/PersonaDetailPanel.tsx) — esconde-se se a flag
    estiver off; botão "Analisar com dados reais" (precisa de cliente + conta).
  - **Não tocou** na lógica de criação/targeting (aditivo + read-only).
- ✅ **Fase 2 (gating concluído)** — flag `audiences.personaTargetingBuilder` + [`/api/audiences/flags`](../../src/app/api/audiences/flags/route.ts):
  com a flag **OFF**, o bloco **SEGMENTOS META some tanto do fluxo de criação**
  ([`AiAudienceTargetingForm`](../../src/components/audiences/create/AiAudienceTargetingForm.tsx) →
  `PersonaManualMetaSegmentsPanel`) **quanto do `PersonaDetailPanel`**. Default ON = sem mudança até
  desligar no admin (propaga em ~60s).
  - **Insights também no fluxo de criação:** o `PersonaInsightsPanel` agora aparece no criador
    (quando há targeting + cliente + conta + flag `audiences.personaInsights`), não só no detalhe.
- 🟡 Falta (peça maior, com OK): **construir o editor de segmentos no Criador de Públicos Meta**
  (`AudiencesLookalikeClient`/menu Meta) — para onde os segmentos "migram" de vez.

## Histórico
- 2026-06-28 (parte 2): **Fase 1 implementada** (camada de Insights & Comparação, endpoint + painel,
  flag `audiences.personaInsights`).
- 2026-06-28: proposta criada (persona v2 = persona + comparação com dados reais; mover segmentos Meta
  para o Criador de Públicos; camada de insights aditiva atrás de flag).
