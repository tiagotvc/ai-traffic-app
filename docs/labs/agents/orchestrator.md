# Orchestrator Agent

| Campo | Valor |
|-------|-------|
| **ID** | `orchestrator` |
| **Status** | `planned` |
| **Fase** | 1 |
| **Tier** | incluído (0 créditos) |
| **Tipo** | `lógico` |
| **Créditos estimados** | 0 |
| **Duração estimada** | ~30s |

## Propósito

Coordena o experimento Labs: valida input, ordena Scientists, controla custo/tempo, consolida dossiê e pode disparar Scientists adicionais se findings relevantes aparecerem (fase 2+).

## Funções

1. Interpretar brief do usuário (produto, nicho, objetivo)
2. Validar `selectedScientists` vs tier do workspace
3. Calcular ordem: executáveis paralelos → lógicos sequenciais
4. Respeitar `maxCredits` e `maxDurationMinutes`
5. Consolidar findings em `dossier` JSON
6. Marcar experimento `completed` ou `failed`
7. (Fase 2+) Disparar Recursive Research se gap detectado

## Inputs obrigatórios

- `experimentId`
- `workspaceId`
- `product`

## Inputs opcionais

- `selectedScientists` — se vazio, preset por profundidade
- `maxCredits`, `maxDurationMinutes`
- `clientId` — enriquece com DNA/histórico

## Fontes

Nenhuma externa. Lê Supabase: experimento, runs, findings.

## Outputs

- Atualiza `labs_experiments.status` e `dossier`
- Não produz `ScientistFinding` diretamente (consolidação)

## Pipeline MVP

```txt
Inngest labs/experiment.created
  → load experiment
  → status running
  → (Inngest steps chamam worker por scientistId)
  → orchestrator/finalize.ts
  → dossier JSON
  → status completed
  → emit labs/experiment.completed
```

## Ordem padrão MVP

```txt
Paralelo: competitor, consumer, trend
Sequencial: hypothesis → confidence
Finalize: orchestrator
```

## Evidência mínima

Experimento só `completed` se ≥1 agent run `success` e dossiê gerado.

## Eventos Inngest

- Consome: `labs/experiment.created`
- Emite: `labs/experiment.started`, `labs/experiment.completed`, `labs/experiment.failed`

## Paths de código

| Repo | Path |
|------|------|
| scientists-worker | `src/orchestrator/` |
| ai-traffic-app | `src/lib/inngest/labs-run-experiment.ts` |

## Changelog

| Data | Autor | Mudança |
|------|-------|---------|
| 2026-06-11 | — | Documentação Fase 0 |
