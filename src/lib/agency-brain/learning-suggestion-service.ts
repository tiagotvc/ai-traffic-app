import "server-only";

import { repositories } from "@/db/repositories";
import { createSuggestedLearning } from "@/lib/agency-brain/client-learning-service";
import { evaluateAllRules } from "@/lib/agency-brain/learning-rules";
import { detectMetricSpikes } from "@/lib/agency-brain/metric-spike-detector";
import { getClientCampaignMetricsWithComparison } from "@/lib/agency-brain/metrics-input";
import { recordTimelineEvent } from "@/lib/agency-brain/timeline-service";
import type { LearningDto } from "@/lib/agency-brain/types";

const WINDOW_DAYS = 7;
const DEFAULT_SPEND_THRESHOLD = 500;

export async function runLearningSuggestionsForClient(
  tenantId: string,
  clientId: string
): Promise<{ created: number; suggestions: LearningDto[] }> {
  const { clientGoal: goalRepo } = await repositories();
  const goal = await goalRepo.findOne({ where: { clientId } });
  const spendThreshold =
    goal?.maxSpendWithoutConversion != null
      ? Number(goal.maxSpendWithoutConversion)
      : DEFAULT_SPEND_THRESHOLD;

  const { current, previous } = await getClientCampaignMetricsWithComparison(
    tenantId,
    clientId,
    WINDOW_DAYS
  );

  if (!current.length) {
    return { created: 0, suggestions: [] };
  }

  const drafts = evaluateAllRules(
    current,
    previous,
    clientId,
    WINDOW_DAYS,
    spendThreshold
  );

  const suggestions: LearningDto[] = [];
  for (const draft of drafts) {
    const created = await createSuggestedLearning(tenantId, clientId, draft);
    if (created) suggestions.push(created);
  }

  const spikes = detectMetricSpikes(current, previous);
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
