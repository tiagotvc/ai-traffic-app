# Jobs noturnos

Orquestrados por Inngest → `POST /internal/labs/nightly-job` no **scientists-worker**.

Cron principal: **`labs/market.daily.scan`** (ex.: 03:00 UTC) — tier Premium.

## Índice

| Job ID | Evento | Fase | Doc |
|--------|--------|------|-----|
| `market.daily.scan` | `labs/market.daily.scan` | 3 | [market-daily-scan.md](./market-daily-scan.md) |
| `competitor.scan` | sub-job | 3 | [competitor-scan.md](./competitor-scan.md) |
| `trend.scan` | sub-job | 3 | [trend-scan.md](./trend-scan.md) |
| `reviews.scan` | sub-job | 3 | [reviews-scan.md](./reviews-scan.md) |
| `social.scan` | sub-job | 3 | [social-scan.md](./social-scan.md) |
| `pricing.scan` | sub-job | 3 | [pricing-scan.md](./pricing-scan.md) |
| `winner.dna.scan` | sub-job | 3 | [winner-dna-scan.md](./winner-dna-scan.md) |
| `failure.dna.scan` | sub-job | 3 | [failure-dna-scan.md](./failure-dna-scan.md) |
| `saturation.scan` | sub-job | 3 | [saturation-scan.md](./saturation-scan.md) |
| `opportunity.scan` | sub-job | 3 | [opportunity-scan.md](./opportunity-scan.md) |
| `weak.signal.scan` | sub-job | 3 | [weak-signal-scan.md](./weak-signal-scan.md) |
| `momentum.scan` | sub-job | 3 | [momentum-scan.md](./momentum-scan.md) |
| `consumer.evolution.scan` | sub-job | 3 | [consumer-evolution-scan.md](./consumer-evolution-scan.md) |
| `market.memory.merge` | sub-job | 3 | [market-memory-merge.md](./market-memory-merge.md) |
| `agency.brain.merge` | sub-job | 2+ | [agency-brain-merge.md](./agency-brain-merge.md) |
| `dream.cycle` | `labs/dream.cycle` | 4 | [dream-cycle.md](./dream-cycle.md) |

## Fluxo

```txt
labs/market.daily.scan (cron)
  → fan-out sub-jobs (Inngest steps ou eventos filhos)
  → cada job: worker handler
  → labs_nightly_jobs log
  → market.memory.merge
  → (opcional) agency.brain.merge por workspace ativo
```

## Habilitação

- Apenas workspaces **Labs Premium** com opt-in
- Config por nicho/cliente em fase posterior
