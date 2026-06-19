# Hypothesis Scientist

| Campo | Valor |
|-------|-------|
| **ID** | `hypothesis` |
| **Status** | `planned` |
| **Fase** | 1 |
| **Tier** | `basic` |
| **Tipo** | `lógico` |
| **Créditos estimados** | 6 |
| **Duração estimada** | ~1–2 min |

## Propósito

Transformar findings dos executáveis em **hipóteses testáveis** com evidências, risco, custo e próximo passo.

## Inputs obrigatórios

- `experimentId`
- Findings de ≥1 executável (`competitor`, `consumer`, ou `trend`)

## Inputs opcionais

- `clientId` — enriquece com histórico de campanhas (fase 2)

## Fontes

Internas: `labs_findings`, `labs_sources` do experimento.

## Outputs

- INSERT `labs_hypotheses`
- INSERT `labs_hypothesis_evidence` (liga findings)
- Findings tipo `opportunity`

Exemplo de hipótese:

```json
{
  "name": "UGC feminino vertical com demonstração",
  "description": "Criativos UGC com mulher demonstrando o produto podem reduzir CPA.",
  "recommendedNextStep": "Criar 3 variações de UGC vs controle."
}
```

## Regra anti-alucinação

**Proibido** gerar hipótese sem:

1. Listar IDs de findings usados
2. `evidence_count` ≥ 2 dimensões (mercado + consumidor, etc.)

Se dados insuficientes → status `partial`, poucas hipóteses.

## Dependências

Roda **após** executáveis selecionados.

## Pipeline

```txt
canRun: exists findings from competitor|consumer|trend
run:
  1. Load all findings + sources
  2. Gemini com prompt grounded (só IDs citados)
  3. Parse hipóteses → labs_hypotheses + evidence links
  4. saveScientistResult
```

## Paths de código

| Repo | Path |
|------|------|
| scientists-worker | `src/scientists/hypothesis-scientist/` |

## Changelog

| Data | Autor | Mudança |
|------|-------|---------|
| 2026-06-11 | — | Documentação Fase 0 |
