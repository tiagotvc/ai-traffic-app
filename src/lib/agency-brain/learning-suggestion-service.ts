import "server-only";

import { repositories } from "@/db/repositories";
import { createSuggestedLearning } from "@/lib/agency-brain/client-learning-service";
import { loadClientSignals, type ClientSignalsContext } from "@/lib/agency-brain/client-signals";
import { detectMetricSpikes } from "@/lib/agency-brain/metric-spike-detector";
import { signalsToLearningDrafts } from "@/lib/agency-brain/signal-mappers";
import { hasActiveSignalDedupe } from "@/lib/agency-brain/signal-dedupe";
import { recordTimelineEvent } from "@/lib/agency-brain/timeline-service";
import type { LearningDto } from "@/lib/agency-brain/types";

const WINDOW_DAYS = 7;

export async function runLearningSuggestionsForClient(
  tenantId: string,
  clientId: string,
  preloaded?: ClientSignalsContext
): Promise<{ created: number; suggestions: LearningDto[] }> {
  const ctx = preloaded ?? (await loadClientSignals(tenantId, clientId, WINDOW_DAYS));

  if (!ctx) {
    return { created: 0, suggestions: [] };
  }

  const drafts = signalsToLearningDrafts(ctx.signals, clientId, ctx.windowDays);

  const suggestions: LearningDto[] = [];
  for (const draft of drafts) {
    const blocked = await hasActiveSignalDedupe(tenantId, clientId, draft.dedupeKey);
    if (blocked.hypothesis) continue;
    const created = await createSuggestedLearning(tenantId, clientId, draft);
    if (created) suggestions.push(created);
  }

  const spikes = detectMetricSpikes(ctx.current, ctx.previous);
  for (const spike of spikes) {
    await recordTimelineEvent(tenantId, clientId, {
      type: "metric_spike",
      title: spike.title,
      description: spike.description,
      metadata: {
        metric: spike.metric,
        deltaPct: spike.deltaPct,
        metaCampaignId: spike.metaCampaignId
      }
    });
  }

  return { created: suggestions.length, suggestions };
}

/**
 * Roda sugestões para todos os clientes do tenant (pós-sync).
 */
export async function runLearningSuggestions(
  tenantId: string,
  clientId?: string
): Promise<{ clientsProcessed: number; totalCreated: number }> {
  const { client: clientRepo } = await repositories();

  const clients = clientId
    ? await clientRepo.find({ where: { tenantId, id: clientId } })
    : await clientRepo.find({ where: { tenantId } });

  let totalCreated = 0;
  for (const c of clients) {
    try {
      const { created } = await runLearningSuggestionsForClient(tenantId, c.id);
      totalCreated += created;
    } catch {
      // continue other clients
    }
  }

  return { clientsProcessed: clients.length, totalCreated };
}
