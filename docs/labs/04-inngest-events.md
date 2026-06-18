# Eventos Inngest

Namespace: **`labs/*`** (não usar `experiment.*` sem prefixo).

Functions registradas em **ai-traffic-app** (`src/app/api/inngest/`). Execução pesada delegada ao **scientists-worker** via HTTP.

## Eventos de experimento

| Evento | Quando |
|--------|--------|
| `labs/experiment.created` | Usuário inicia pesquisa |
| `labs/experiment.started` | Orchestrator começou |
| `labs/experiment.agent.started` | Step de um Scientist iniciou |
| `labs/experiment.agent.completed` | Scientist terminou com sucesso |
| `labs/experiment.agent.failed` | Scientist falhou (retry?) |
| `labs/experiment.completed` | Dossiê pronto |
| `labs/experiment.failed` | Erro fatal / timeout |

Eventos opcionais (fase 2+):

- `labs/experiment.data.collected`
- `labs/experiment.findings.structured`
- `labs/experiment.hypotheses.generated`
- `labs/experiment.simulation.started`
- `labs/experiment.simulation.completed`

## Eventos noturnos

| Evento | Descrição |
|--------|-----------|
| `labs/market.daily.scan` | Cron principal (ex.: 03:00 UTC) |
| `labs/dream.cycle` | Dream Scientist noturno |
| `labs/research.recursive.created` | Nova linha de pesquisa disparada por agente |

Sub-jobs (disparados por `market.daily.scan` ou diretamente):

Ver [nightly-jobs/README.md](./nightly-jobs/README.md).

## Workflow MVP: `runLabsExperiment`

Handler de `labs/experiment.created`:

```txt
1. load experiment (Supabase)
2. status → running
3. executáveis em paralelo (steps Inngest):
     - competitor, consumer, trend
     → POST /internal/labs/run-scientist
4. lógicos em sequência:
     - hypothesis → confidence
5. orchestrator finalize (consolidar dossiê)
6. status → completed
7. opcional: emit agency.brain.merge
```

Exemplo conceitual:

```ts
inngest.createFunction(
  { id: "labs-run-experiment" },
  { event: "labs/experiment.created" },
  async ({ event, step }) => {
    const { experimentId } = event.data;
    const experiment = await step.run("load", () => loadExperiment(experimentId));

    const executables = ["competitor", "consumer", "trend"].filter(
      (id) => experiment.selectedScientists.includes(id),
    );

    for (const scientistId of executables) {
      await step.run(`run-${scientistId}`, () =>
        callWorker("/internal/labs/run-scientist", { experimentId, scientistId }),
      );
    }

    if (experiment.selectedScientists.includes("hypothesis")) {
      await step.run("run-hypothesis", () =>
        callWorker("/internal/labs/run-scientist", { experimentId, scientistId: "hypothesis" }),
      );
    }

    if (experiment.selectedScientists.includes("confidence")) {
      await step.run("run-confidence", () =>
        callWorker("/internal/labs/run-scientist", { experimentId, scientistId: "confidence" }),
      );
    }

    await step.run("finalize", () => finalizeExperiment(experimentId));
  },
);
```

## Retries e limites

- Retry por step (Inngest default + backoff)
- `maxDurationMinutes` no experimento → cancel + `failed`
- `maxCredits` → worker aborta Scientist restantes

## Cron

```ts
inngest.createFunction(
  { id: "labs-market-daily-scan" },
  { cron: "0 3 * * *" },
  async ({ step }) => {
    await step.run("scan", () =>
      callWorker("/internal/labs/nightly-job", { jobId: "market.daily.scan" }),
    );
  },
);
```

Fase 3+: habilitar crons por workspace/tier Premium.
