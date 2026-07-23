import "server-only";

import { listDashboardBrainShelf } from "@/lib/agency-brain/dashboard-shelf-service";
import { listAgencyHypotheses } from "@/lib/agency-brain/agency-hypotheses-service";
import {
  computeAccountHealthScore,
  computeAgencyBrainScore
} from "@/lib/dashboard/account-health-score";
import type { MetricKey } from "@/lib/dashboard-metrics";
import {
  loadGoogleMetricTotals,
  loadMetricTotals,
  mergeMetricTotals,
  resolveDashboardScope
} from "@/lib/dashboard-query";
import { resolveRanges } from "@/lib/dashboard-ranges";
import type { PeriodState } from "@/components/PeriodFilter";

type Summary = Partial<Record<MetricKey, number>>;

type ResolverContext = {
  tenantId: string;
  clientFilter?: string;
  accountFilter?: string;
  period: PeriodState;
  tz?: string;
};

export async function resolveWidgetData(
  dataSource: string,
  ctx: ResolverContext
): Promise<unknown> {
  switch (dataSource) {
    case "brainShelf":
      return { items: await listDashboardBrainShelf(ctx.tenantId, 8) };
    case "agencyBrainComposite": {
      const [learnings, hypotheses] = await Promise.all([
        listDashboardBrainShelf(ctx.tenantId, 3),
        listAgencyHypotheses(ctx.tenantId, 3)
      ]);
      const score = computeAgencyBrainScore({
        learnings: learnings.length,
        hypotheses: hypotheses.length,
        highImpactLearnings: learnings.filter((l) => l.impact === "HIGH").length,
        pendingSuggestions: learnings.filter((l) => l.status === "SUGGESTED").length
      });
      return { score, learnings, hypotheses, opportunities: learnings.filter((l) => l.impact === "HIGH").slice(0, 3) };
    }
    case "accountHealthScore": {
      const { current, previous } = resolveRanges(ctx.period, ctx.tz);
      if (!current) {
        return computeAccountHealthScore({}, null, { learningsCount: 0 });
      }
      const { accountIds, clientIds } = await resolveDashboardScope(
        ctx.tenantId,
        ctx.clientFilter ?? "",
        ctx.accountFilter ?? ""
      );
      const days = Math.max(
        1,
        Math.round((Date.parse(current.until) - Date.parse(current.since)) / 86_400_000) + 1
      );
      const rCur = { since: current.since, until: current.until };
      const rPrev = previous ? { since: previous.since, until: previous.until } : null;
      const [curMeta, curGoogle, prevMeta, prevGoogle, learnings] = await Promise.all([
        loadMetricTotals(accountIds, days, rCur),
        loadGoogleMetricTotals(clientIds, days, rCur),
        rPrev ? loadMetricTotals(accountIds, days, rPrev) : Promise.resolve(null),
        rPrev ? loadGoogleMetricTotals(clientIds, days, rPrev) : Promise.resolve(null),
        listDashboardBrainShelf(ctx.tenantId, 4)
      ]);
      const curTotals = mergeMetricTotals(curMeta, curGoogle);
      const prevTotals = prevMeta && prevGoogle ? mergeMetricTotals(prevMeta, prevGoogle) : null;
      const toSummary = (t: Awaited<ReturnType<typeof loadMetricTotals>> | null): Summary | null => {
        if (!t) return null;
        const ctr = t.impressions > 0 ? (t.clicks / t.impressions) * 100 : 0;
        const cpa = t.conversions > 0 ? t.spend / t.conversions : 0;
        const frequency = t.reach > 0 ? t.impressions / t.reach : 0;
        return {
          spend: t.spend,
          impressions: t.impressions,
          clicks: t.clicks,
          conversions: t.conversions,
          reach: t.reach,
          ctr,
          cpa,
          roas: t.roas,
          frequency
        };
      };
      return computeAccountHealthScore(toSummary(curTotals) ?? {}, toSummary(prevTotals), {
        learningsCount: learnings.length
      });
    }
    case "singleMetric":
    case "metricPrism":
    case "performanceChart":
    case "alertsFeed":
    case "alertCard":
    case "agencyHealth":
    case "dualMetricChart":
      return { delegated: true, dataSource };
    default:
      return { empty: true };
  }
}
