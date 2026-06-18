# Confidence Scientist

| Campo | Valor |
|-------|-------|
| **ID** | `confidence` |
| **Status** | `planned` |
| **Fase** | 1 |
| **Tier** | `pro` (incluído no pipeline MVP técnico) |
| **Tipo** | `lógico` |
| **Créditos estimados** | 4 |
| **Duração estimada** | ~30–60s |

## Propósito

Calcular scores de confiança **derivados de evidências** — nunca números inventados.

## Inputs obrigatórios

- `experimentId`
- `labs_hypotheses` geradas pelo Hypothesis Scientist
- Findings agregados por dimensão

## Scores por dimensão

```yaml
market_evidence:      # volume e qualidade fontes mercado
client_evidence:      # histórico conta (0 se sem clientId)
competitor_evidence:  # ads/patterns concorrentes
trend_evidence:       # alinhamento com tendência
creative_similarity:  # fase 2+ com Creative Scientist
final_confidence:     # média ponderada
```

Exemplo:

```yaml
market_evidence: 91
client_evidence: 74
competitor_evidence: 88
trend_evidence: 95
final_confidence: 87
```

## Fórmula MVP (simplificada)

```txt
final = weighted_avg(market, competitor, trend, client?)
pesos default: market 0.25, competitor 0.30, trend 0.25, client 0.20
```

Ajuste por nicho via Meta Scientist (fase 4).

## Regra anti-alucinação

Cada score deve mapear para métricas rastreáveis:

- `adsAnalyzed`, `reviewsAnalyzed`, `trendScore`, `campaignsUsed`

Sem métricas → score null, hipótese flagged `low_data`.

## Dependências

Roda **após** Hypothesis Scientist.

## Outputs

- UPDATE `labs_hypotheses.confidence` e dimensões
- Findings opcionais tipo `risk` se confiança baixa

## Pipeline

```txt
canRun: exists labs_hypotheses for experiment
run:
  1. Aggregate evidence metrics per hypothesis
  2. Compute dimension scores (deterministic TS, not LLM-only)
  3. Optional Gemini: narrative summary only
  4. saveScientistResult + update hypotheses
```

## Paths de código

| Repo | Path |
|------|------|
| scientists-worker | `src/scientists/confidence-scientist/` |

## Changelog

| Data | Autor | Mudança |
|------|-------|---------|
| 2026-06-11 | — | Documentação Fase 0 |
