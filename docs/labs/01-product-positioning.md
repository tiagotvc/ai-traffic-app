# Posicionamento de produto

## Feature premium

Labs é vendido como tier acima do Agency Brain básico. Substitui o **Laboratório A/B manual** (registro de experimentos com forecast) por **pesquisa de mercado automatizada**.

| Módulo atual | Rota atual | Destino |
|--------------|------------|---------|
| Laboratório | `/agency-brain/experiments` | Redirect → `/agency-brain/labs` |
| Hipóteses | `/agency-brain/hypotheses` | Recebe merge de hipóteses Labs com evidência |
| Aprendizados / DNA | existentes | Enriquecidos via `agency.brain.merge` |

Feature flag atual: `allowAgencyBrainExperiments` → evoluir para `allowLabs` + `labsTier`.

## Tiers de plano

### Labs Basic

Scientists incluídos:

- Competitor Scientist
- Consumer Scientist
- Trend Scientist
- Hypothesis Scientist

### Labs Pro

Inclui Basic +:

- Confidence Scientist
- Creative, Offer, Psychology, Statistical
- Contradiction, Winner, Failure
- Anti-Hypothesis Scientist

### Labs Premium

Inclui Pro +:

- Vision, Simulation, Debate Engine
- Opportunity Gap, Saturation, Weak Signal
- Knowledge Graph, Memory Compression, Dream Scientist
- Jobs noturnos (market watch)

### Add-ons (futuro)

- Deep Research (profundidade extra)
- Visão computacional em escala
- Geração de criativos (Flux Pro / Fal.ai)
- Monte Carlo, Recursive Research
- App/Game Intelligence
- Competitor Watch diário

## Profundidade na UI

Presets sugeridos na criação do experimento:

| Preset | Scientists | Público |
|--------|------------|---------|
| **Básica** | Competitor, Consumer, Trend, Hypothesis | Exploração rápida |
| **Avançada** | + Creative, Offer, Psychology, Statistical, Contradiction | Agências Pro |
| **Deep Research** | + Vision, Simulation, Debate, Gap, Saturation, Weak Signal, KG, Dream | Premium |

O usuário pode montar manualmente com checkboxes; cada card mostra créditos, tempo, fontes e tier.

## UX resumida

| Tela | Conteúdo |
|------|----------|
| **Lista** | Experimentos recentes, status, créditos consumidos |
| **Criar** | Brief + Scientists + max créditos/tempo |
| **Execução** | Progresso por Scientist, fontes processadas |
| **Dossiê** | Resumo, oportunidades, hipóteses ranqueadas, anti-hipóteses, evidências, próximos passos |

## Monetização

- Créditos por Scientist (ver [07-billing-and-quotas.md](./07-billing-and-quotas.md))
- Estimativa antes de iniciar; bloqueio se saldo insuficiente
- MVP: calcular e persistir `creditsUsed`; cobrança Stripe integrada depois
