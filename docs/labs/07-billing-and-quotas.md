# Billing e quotas

## Créditos por Scientist

Valores iniciais (ajustáveis):

```ts
const SCIENTIST_CREDITS: Record<string, number> = {
  orchestrator: 0,      // incluído no experimento
  competitor: 10,
  consumer: 12,
  trend: 8,
  hypothesis: 6,
  confidence: 4,
  offer: 8,
  creative: 12,
  psychology: 8,
  statistical: 10,
  contradiction: 6,
  winner: 8,
  failure: 6,
  antiHypothesis: 5,
  vision: 30,
  simulation: 40,
  debate: 20,
  opportunityGap: 12,
  saturation: 10,
  weakSignal: 14,
  knowledgeGraph: 25,
  dream: 15,
  monteCarlo: 50,
};
```

## Fluxo de créditos

1. **Estimativa** na UI: soma dos Scientists selecionados
2. **Validação** contra saldo do workspace antes de `queued`
3. **Consumo** por run: `labs_credits_usage` + incremento `labs_experiments.credits_used`
4. **Teto** `maxCredits`: worker para Scientists restantes se exceder

MVP: tracking interno; Stripe metered billing depois.

## Tiers vs Scientists

| Tier | Scientists |
|------|------------|
| **Basic** | competitor, consumer, trend, hypothesis |
| **Pro** | + confidence, creative, offer, psychology, statistical, contradiction, winner, failure, antiHypothesis |
| **Premium** | + vision, simulation, debate, opportunityGap, saturation, weakSignal, knowledgeGraph, dream |

UI desabilita Scientists acima do tier (cadeado + upgrade).

## Feature flags

Evolução em `src/lib/billing/types.ts`:

| Flag atual | Destino |
|------------|---------|
| `allowAgencyBrainExperiments` | `allowLabs` |
| — | `labsTier`: `none` \| `basic` \| `pro` \| `premium` |

## Quota AI existente

Labs Scientists que chamam Gemini contam separadamente ou dentro de `maxAiRequestsPerMonth` — **decisão Fase 1:** créditos Labs são unidade de produto; chamadas Gemini internas ao worker não expõem quota Gemini ao usuário no MVP.

## Add-ons

- Pacotes de créditos extras
- Deep Research (multiplicador 1.5x)
- Nightly market watch (Premium only)
