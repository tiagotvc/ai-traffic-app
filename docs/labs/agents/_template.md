# {Nome do Scientist}

| Campo | Valor |
|-------|-------|
| **ID** | `{kebab-id}` |
| **Status** | `planned` \| `partial` \| `implemented` \| `deprecated` |
| **Fase** | 1 \| 2 \| 3 \| 4 |
| **Tier** | `basic` \| `pro` \| `premium` |
| **Tipo** | `executável` \| `lógico` |
| **Créditos estimados** | N |
| **Duração estimada** | Ns |

## Propósito

Uma frase: o que este Scientist faz e por quê existe.

## Inputs obrigatórios

- `experimentId`
- …

## Inputs opcionais

- …

## Fontes

Lista de fontes externas/internas. Ver [sources/](../sources/).

## Outputs / findings

Tipos de `ScientistFinding` produzidos:

- `hook`, `pain`, `desire`, …

## Dependências

Scientists que devem rodar **antes** (ou findings necessários):

- …

## Evidência mínima

Regras para persistir resultados (ex.: mínimo N fontes, score ≥ X).

## Pipeline

```txt
canRun(input) → run(input) → saveScientistResult
```

Eventos Inngest relacionados:

- `labs/experiment.agent.started`
- `labs/experiment.agent.completed`

## Paths de código

| Repo | Path |
|------|------|
| scientists-worker | `src/scientists/{kebab-id}/` |
| ai-traffic-app | `src/lib/labs/types.ts` (espelho) |

## Changelog

| Data | Autor | Mudança |
|------|-------|---------|
| YYYY-MM-DD | — | Criado (planned) |
