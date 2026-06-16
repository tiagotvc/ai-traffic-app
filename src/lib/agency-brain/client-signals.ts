import "server-only";

import { repositories } from "@/db/repositories";
import { analyzeClientCampaigns, type CampaignSignal } from "@/lib/agency-brain/campaign-signal-analyzer";
import {
  getCampaignBaselinesMap,
  getClientMetricsBundle
} from "@/lib/agency-brain/metrics-input";
import type { CampaignMetricsRow } from "@/lib/agency-brain/types";

const DEFAULT_SPEND_THRESHOLD = 500;
const BASELINE_DAYS = 30;

export type ClientSignalsContext = {
  signals: CampaignSignal[];
  current: CampaignMetricsRow[];
  previous: CampaignMetricsRow[];
  baselineByCampaign: Map<string, import("@/lib/agency-brain/metrics-input").BaselineMetrics>;
  spendThreshold: number;
  windowDays: number;
  totalSpend: number;
};

export async function loadClientSignals(
  tenantId: string,
  clientId: string,
  windowDays = 7
): Promise<ClientSignalsContext | null> {
  const { clientGoal: goalRepo } = await repositories();
  const goal = await goalRepo.findOne({ where: { clientId } });
  const spendThreshold =
    goal?.maxSpendWithoutConversion != null
      ? Number(goal.maxSpendWithoutConversion)
      : DEFAULT_SPEND_THRESHOLD;

  const { current, previous, baselineByCampaign } = await getClientMetricsBundle(
    tenantId,
    clientId,
    windowDays,
    BASELINE_DAYS
  );

  if (!current.length) return null;

  const signals = analyzeClientCampaigns({
    clientId,
    current,
    previous,
    baseline30d: baselineByCampaign,
    goal,
    spendThreshold,
    windowDays
  });

  const totalSpend = current.reduce((s, r) => s + r.spend, 0);

  return { signals, current, previous, baselineByCampaign, spendThreshold, windowDays, totalSpend };
}
