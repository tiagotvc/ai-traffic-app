import { inngest } from "@/lib/inngest/client";
import {
  finalizeOnWorker,
  orderScientistsForPipeline,
  runScientistOnWorker
} from "@/lib/labs/worker-client";
import { markLabsExperimentFailed } from "@/lib/labs/experiment-service";

export const runLabsExperiment = inngest.createFunction(
  { id: "labs-run-experiment", retries: 2 },
  { event: "labs/experiment.created" },
  async ({ event, step }) => {
    const { experimentId, userId, selectedScientists } = event.data;
    const { executables, logicals } = orderScientistsForPipeline(selectedScientists);

    try {
      for (const scientistId of executables) {
        await step.run(`run-${scientistId}`, async () => {
          await runScientistOnWorker(experimentId, scientistId, userId);
        });
      }

      for (const scientistId of logicals) {
        await step.run(`run-${scientistId}`, async () => {
          await runScientistOnWorker(experimentId, scientistId, userId);
        });
      }

      await step.run("finalize", async () => {
        await finalizeOnWorker(experimentId);
      });

      // Fase 3 (docs/orion-architecture §2.2): conclusão publica o aprendizado + evento.
      await step.run("publish-outcome", async () => {
        const { repositories } = await import("@/db/repositories");
        const { labsExperiment } = await repositories();
        const experiment = await labsExperiment.findOne({ where: { id: experimentId } });
        if (!experiment) return;
        const { publishLabsExperimentOutcome } = await import(
          "@/lib/laboratory/experiment-outcomes"
        );
        await publishLabsExperimentOutcome(experiment.tenantId, experimentId);
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Labs experiment failed";
      await markLabsExperimentFailed(experimentId, message);
      throw err;
    }
  }
);
