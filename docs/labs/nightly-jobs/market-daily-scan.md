# market.daily.scan

| Campo | Valor |
|-------|-------|
| **job_id** | `market.daily.scan` |
| **Evento** | `labs/market.daily.scan` |
| **Cron** | `0 3 * * *` (sugestão) |
| **Fase** | 3 |

## Propósito

Job pai que dispara scans diários de mercado para nichos monitorados.

## Sub-jobs

competitor.scan, trend.scan, reviews.scan, social.scan, pricing.scan, winner.dna.scan, failure.dna.scan, saturation.scan, opportunity.scan, weak.signal.scan, momentum.scan, consumer.evolution.scan, market.memory.merge

## Payload

```json
{
  "workspaceId": "uuid",
  "niche": "skincare",
  "market": "BR",
  "clientId": "uuid optional"
}
```
