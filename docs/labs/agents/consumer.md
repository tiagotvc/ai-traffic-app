# Consumer Scientist

| Campo | Valor |
|-------|-------|
| **ID** | `consumer` |
| **Status** | `planned` |
| **Fase** | 1 |
| **Tier** | `basic` |
| **Tipo** | `executável` |
| **Créditos estimados** | 12 |
| **Duração estimada** | ~4–6 min |

## Propósito

Entender o consumidor real: dores, desejos, objeções, linguagem e motivos de compra/rejeição a partir de reviews e conversas sociais.

## Inputs obrigatórios

- `experimentId`, `product`
- `niche` ou `market` recomendado

## Fontes

Ver [sources/reviews.md](../sources/reviews.md), [sources/social-comments.md](../sources/social-comments.md).

| Fonte | Dados |
|-------|-------|
| Reddit | Threads, linguagem, objeções |
| Amazon / ML / Shopee | Reviews, estrelas, reclamações |
| Reclame Aqui / Trustpilot | Problemas, expectativas |
| YouTube / TikTok / IG comments | Reações espontâneas |
| App Store / Play Store | Apps do nicho |

## Extrair (findings)

| type | Exemplo |
|------|---------|
| `pain` | "Medo de efeito colateral" |
| `desire` | "Recuperar autoestima" |
| `objection` | "Demora para ver resultado" |
| `audience` | Mulheres 30–45 preocupadas com queda |

## Regra de evidência

Cada pain/desire deve citar ≥3 fontes independentes ou `evidence_count` ≥ N reviews com termo similar (Statistical Scientist reforça na fase 2).

## Dependências

Nenhuma (paralelo no MVP).

## Outputs

```json
{
  "summary": "Consumidor valoriza resultados visíveis em 90 dias e desconfia de promessas instantâneas",
  "metadata": { "reviewsAnalyzed": 2143, "threadsAnalyzed": 47 }
}
```

## Pipeline

```txt
canRun: product + niche/market
run:
  1. Queries por produto/nicho nas fontes
  2. Agregar texto bruto → labs_sources
  3. Gemini: cluster dores/desejos/objeções
  4. saveScientistResult
```

## Paths de código

| Repo | Path |
|------|------|
| scientists-worker | `src/scientists/consumer-scientist/` |

## Changelog

| Data | Autor | Mudança |
|------|-------|---------|
| 2026-06-11 | — | Documentação Fase 0 |
