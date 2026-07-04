import { inngest } from "@/lib/inngest/client";

/**
 * Análise inicial do Cortex após a PRIMEIRA sincronização Meta de um tenant
 * (fluxo do warehouse, pedido 2026-07-04):
 * 1. enfileira backfill histórico de 90 dias (snapshots → Postgres → export horário
 *    empurra para orion_raw.meta_campaign_insights);
 * 2. roda o brain-pipeline em background (deep analysis) — gera recomendações,
 *    learnings e hipóteses iniciais, que fluem para o warehouse pelos hooks.
 */
export const cortexInitialAnalysis = inngest.createFunction(
  { id: "cortex-initial-analysis", retries: 2 },
  { event: "meta/first-sync.completed" },
  async ({ event, step }) => {
    const { tenantId } = event.data as { tenantId: string };

    await step.run("backfill-90d", async () => {
      const { getTenantMetaAccessToken } = await import("@/lib/meta-auth-store");
      const token = await getTenantMetaAccessToken(tenantId);
      if (!token) return { skipped: "no_meta_token" };
      const { enqueueHistoricalBackfill } = await import("@/lib/historical-backfill");
      return enqueueHistoricalBackfill({
        tenantId,
        metaAccessToken: token,
        depthDays: 90
      });
    });

    await step.run("deep-analysis", async () => {
      const { runAgencyBrainPipeline } = await import("@/lib/agency-brain/brain-pipeline");
      await runAgencyBrainPipeline(tenantId);
    });

    await step.run("emit-event", async () => {
      const { emitDomainEvent } = await import("@/lib/events/domain-events");
      await emitDomainEvent({
        tenantId,
        module: "brain",
        type: "brain.initial_analysis.completed",
        payload: { backfillDepthDays: 90 }
      });
    });
  }
);
