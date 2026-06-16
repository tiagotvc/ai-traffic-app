import "server-only";

import { repositories } from "@/db/repositories";
import { getClientCampaignMetrics } from "@/lib/agency-brain/metrics-input";

export type MetricsOutcomeSnapshot = {
  cpa: number | null;
  ctr: number;
  roas: number;
  spend: number;
  conversions: number;
  windowDays: number;
  capturedAt: string;
  metaCampaignId?: string | null;
};

const OUTCOME_WAIT_DAYS = 7;

export async function captureClientMetricsSnapshot(
  tenantId: string,
  clientId: string,
  metaCampaignId?: string | null,
  windowDays = 7
): Promise<MetricsOutcomeSnapshot> {
  const rows = await getClientCampaignMetrics(tenantId, clientId, windowDays);
  const filtered = metaCampaignId
    ? rows.filter((r) => r.metaCampaignId === metaCampaignId)
    : rows;

  let spend = 0;
  let conversions = 0;
  let impressions = 0;
  let clicks = 0;
  let roasSum = 0;
  let roasCount = 0;

  for (const r of filtered) {
    spend += r.spend;
    conversions += r.conversions;
    impressions += r.impressions;
    clicks += r.clicks;
    if (r.roas > 0) {
      roasSum += r.roas;
      roasCount += 1;
    }
  }

  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cpa = conversions > 0 ? spend / conversions : null;
  const roas = roasCount > 0 ? roasSum / roasCount : 0;

  return {
    cpa,
    ctr,
    roas,
    spend,
    conversions,
    windowDays,
    capturedAt: new Date().toISOString(),
    metaCampaignId: metaCampaignId ?? null
  };
}

export function daysSince(iso: string): number {
  const then = new Date(iso).getTime();
  const now = Date.now();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

export function isOutcomeReady(executedAtIso: string): boolean {
  return daysSince(executedAtIso) >= OUTCOME_WAIT_DAYS;
}

export function formatMetricDelta(
  label: string,
  before: number | null,
  after: number | null,
  opts: { lowerIsBetter?: boolean; currency?: boolean; suffix?: string } = {}
): string | null {
  if (before == null || after == null) return null;
  if (before === 0 && after === 0) return null;

  const deltaPct = before !== 0 ? ((after - before) / before) * 100 : 0;
  const improved = opts.lowerIsBetter ? after < before : after > before;
  const sign = deltaPct > 0 ? "+" : "";
  const unit = opts.currency ? "R$" : "";
  const suffix = opts.suffix ?? "";

  const beforeStr = opts.currency ? `${unit}${before.toFixed(2)}` : `${before.toFixed(1)}${suffix}`;
  const afterStr = opts.currency ? `${unit}${after.toFixed(2)}` : `${after.toFixed(1)}${suffix}`;

  return `${label}: ${beforeStr} → ${afterStr} (${sign}${deltaPct.toFixed(0)}%)${improved ? " ✓" : ""}`;
}

export function buildOutcomeSummary(
  baseline: MetricsOutcomeSnapshot,
  after: MetricsOutcomeSnapshot
): string {
  const parts: string[] = [];

  const cpaLine = formatMetricDelta("CPA", baseline.cpa, after.cpa, {
    lowerIsBetter: true,
    currency: true
  });
  if (cpaLine) parts.push(cpaLine);

  const ctrLine = formatMetricDelta("CTR", baseline.ctr, after.ctr, {
    suffix: "%"
  });
  if (ctrLine) parts.push(ctrLine);

  const roasLine = formatMetricDelta("ROAS", baseline.roas, after.roas, {
    suffix: "x"
  });
  if (roasLine) parts.push(roasLine);

  return parts.length ? parts.join(" · ") : "Métricas estáveis no período.";
}

export async function enrichSuggestionExecutedEvent(
  tenantId: string,
  clientId: string,
  eventId: string,
  metadata: Record<string, unknown> | null,
  executedAt: string
): Promise<Record<string, unknown> | null> {
  if (!metadata?.metricsBaseline) return metadata;

  const baseline = metadata.metricsBaseline as MetricsOutcomeSnapshot;
  const enriched = { ...metadata };

  if (!isOutcomeReady(executedAt)) {
    enriched.outcomeStatus = "pending";
    enriched.outcomeReadyInDays = Math.max(0, OUTCOME_WAIT_DAYS - daysSince(executedAt));
    return enriched;
  }

  if (metadata.metricsOutcome) {
    enriched.outcomeStatus = "ready";
    enriched.outcomeSummary =
      (metadata.outcomeSummary as string | undefined) ??
      buildOutcomeSummary(baseline, metadata.metricsOutcome as MetricsOutcomeSnapshot);
    return enriched;
  }

  const after = await captureClientMetricsSnapshot(
    tenantId,
    clientId,
    baseline.metaCampaignId ?? null,
    baseline.windowDays
  );

  enriched.metricsOutcome = after;
  enriched.outcomeStatus = "ready";
  enriched.outcomeSummary = buildOutcomeSummary(baseline, after);

  const { clientTimelineEvent: repo } = await repositories();
  const row = await repo.findOne({ where: { id: eventId, tenantId, clientId } });
  if (row) {
    row.metadata = enriched;
    await repo.save(row);
  }

  return enriched;
}
