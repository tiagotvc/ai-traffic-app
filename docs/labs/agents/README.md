# Índice de Scientists e Engines

55 agentes conceituais (1 Orchestrator + 54 Scientists/Engines).

**Legenda tipo:** `E` = executável (coleta externa) · `L` = lógico (raciocina sobre findings)

## Fase 1 — MVP (`documented`)

| ID | Nome | Status | Tier | Tipo | Doc |
|----|------|--------|------|------|-----|
| `orchestrator` | Orchestrator Agent | planned | — | L | [orchestrator.md](./orchestrator.md) |
| `competitor` | Competitor Scientist | planned | basic | E | [competitor.md](./competitor.md) |
| `consumer` | Consumer Scientist | planned | basic | E | [consumer.md](./consumer.md) |
| `trend` | Trend Scientist | planned | basic | E | [trend.md](./trend.md) |
| `hypothesis` | Hypothesis Scientist | planned | basic | L | [hypothesis.md](./hypothesis.md) |
| `confidence` | Confidence Scientist | planned | pro | L | [confidence.md](./confidence.md) |

## Fase 2 — Pro (`planned`)

| ID | Nome | Tier | Tipo | Doc |
|----|------|------|------|-----|
| `creative` | Creative Scientist | pro | E | [creative.md](./creative.md) |
| `offer` | Offer Scientist | pro | E | [offer.md](./offer.md) |
| `psychology` | Psychology Scientist | pro | L | [psychology.md](./psychology.md) |
| `statistical` | Statistical Scientist | pro | L | [statistical.md](./statistical.md) |
| `anti-hypothesis` | Anti-Hypothesis Scientist | pro | L | [anti-hypothesis.md](./anti-hypothesis.md) |
| `contradiction` | Contradiction Scientist | pro | L | [contradiction.md](./contradiction.md) |
| `winner` | Winner Scientist | pro | L | [winner.md](./winner.md) |
| `failure` | Failure / Graveyard Scientist | pro | L | [failure.md](./failure.md) |
| `persona` | Persona Scientist | pro | L | [persona.md](./persona.md) |
| `language` | Language Scientist | pro | L | [language.md](./language.md) |
| `hook` | Hook Scientist | pro | L | [hook.md](./hook.md) |
| `emotion` | Emotion Scientist | pro | L | [emotion.md](./emotion.md) |
| `pricing` | Pricing Scientist | pro | E | [pricing.md](./pricing.md) |
| `social` | Social Scientist | pro | E | [social.md](./social.md) |
| `cost` | Cost Scientist | pro | L | [cost.md](./cost.md) |
| `effort` | Effort Scientist | pro | L | [effort.md](./effort.md) |
| `roi` | ROI Scientist | pro | L | [roi.md](./roi.md) |

## Fase 3 — Premium (`planned`)

| ID | Nome | Tier | Tipo | Doc |
|----|------|------|------|-----|
| `vision` | Vision Scientist | premium | E | [vision.md](./vision.md) |
| `opportunity-gap` | Opportunity Gap Scientist | premium | L | [opportunity-gap.md](./opportunity-gap.md) |
| `saturation` | Saturation Scientist | premium | L | [saturation.md](./saturation.md) |
| `weak-signal` | Weak Signal Scientist | premium | E | [weak-signal.md](./weak-signal.md) |
| `momentum` | Momentum Scientist | premium | L | [momentum.md](./momentum.md) |
| `historian` | Historian Scientist | premium | L | [historian.md](./historian.md) |
| `time` | Time Scientist | pro | L | [time.md](./time.md) |
| `geo` | Geo Scientist | pro | L | [geo.md](./geo.md) |
| `influencer` | Influencer Scientist | premium | E | [influencer.md](./influencer.md) |
| `content` | Content Scientist | pro | E | [content.md](./content.md) |
| `app` | App Scientist | premium | E | [app.md](./app.md) |
| `game` | Game Scientist | premium | E | [game.md](./game.md) |
| `simulation` | Simulation Scientist | premium | L | [simulation.md](./simulation.md) |
| `debate` | Debate Engine | premium | L | [debate.md](./debate.md) |
| `forecast` | Forecast Scientist | premium | L | [forecast.md](./forecast.md) |
| `self-reflection` | Self Reflection Scientist | pro | L | [self-reflection.md](./self-reflection.md) |
| `knowledge-graph` | Knowledge Graph Scientist | premium | L | [knowledge-graph.md](./knowledge-graph.md) |
| `memory-compression` | Memory Compression Scientist | premium | L | [memory-compression.md](./memory-compression.md) |

## Fase 4 — Advanced (`planned`)

| ID | Nome | Tier | Tipo | Doc |
|----|------|------|------|-----|
| `meme` | Meme Scientist | premium | L | [meme.md](./meme.md) |
| `monte-carlo` | Monte Carlo Scientist | premium | L | [monte-carlo.md](./monte-carlo.md) |
| `future` | Future Scientist | premium | L | [future.md](./future.md) |
| `darwin` | Darwin Scientist | premium | L | [darwin.md](./darwin.md) |
| `meta` | Meta Scientist | premium | L | [meta.md](./meta.md) |
| `graph-rag` | GraphRAG Engine | premium | L | [graph-rag.md](./graph-rag.md) |
| `dream` | Dream Scientist | premium | L | [dream.md](./dream.md) |
| `curiosity` | Curiosity Engine | premium | L | [curiosity.md](./curiosity.md) |
| `recursive-research` | Recursive Research Engine | premium | L | [recursive-research.md](./recursive-research.md) |
| `scientist-factory` | Scientist Factory | premium | L | [scientist-factory.md](./scientist-factory.md) |
| `black-swan` | Black Swan Scientist | premium | L | [black-swan.md](./black-swan.md) |
| `civilization` | Civilization Scientist | premium | L | [civilization.md](./civilization.md) |
| `universe` | Universe Scientist | premium | L | [universe.md](./universe.md) |
| `world-model` | World Model Engine | premium | L | [world-model.md](./world-model.md) |

## Pipeline MVP

```txt
Paralelo (E): competitor → consumer → trend
Sequencial (L): hypothesis → confidence
Finalize: orchestrator
```

## Como adicionar um Scientist

1. Copiar [_template.md](./_template.md)
2. Implementar em `scientists-worker/src/scientists/<id>/`
3. Registrar em `registry.ts`
4. Atualizar esta tabela e [07-billing-and-quotas.md](../07-billing-and-quotas.md)
