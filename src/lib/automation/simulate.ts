import "server-only";

import { Between, In } from "typeorm";

import { repositories } from "@/db/repositories";
import { num } from "@/lib/goal-types";
import { normalizeConditionGroups } from "@/lib/automation/rule-templates";

/**
 * Simulação (backtest) de uma regra de automação contra o histórico real do tenant.
 *
 * Reproduz o comportamento do motor (`runAutomationEngine`): para cada dia do período
 * simulado, avalia a condição sobre a janela móvel dos 7 dias anteriores — a mesma
 * agregação e a mesma normalização de grupos (via `normalizeConditionGroups`) que o
 * motor usa em produção. Nada é executado: é 100% leitura sobre `CampaignMetricSnapshot`.
 */

export type SimulateRuleInput = {
  condition: {
    groups?: Array<Array<{ metric?: string; op?: string; value?: number }>>;
    match?: string;
    conditions?: Array<{ metric?: string; op?: string; value?: number }>;
    metric?: string;
    op?: string;
    value?: number;
    minSpend?: number;
    schedule?: { startHour?: number; endHour?: number };
  };
  action: { type: string; budgetPercent?: number };
  clientId?: string | null;
  /** Dias de histórico a simular (janela de replay). */
  days?: number;
};

export type SimulatedCampaign = {
  metaCampaignId: string;
  campaignName: string | null;
  /** Primeiro dia (ISO) em que a condição teria disparado. */
  firstTriggerDay: string;
  /** Em quantos dias do período a condição foi verdadeira. */
  daysTriggered: number;
  /** Gasto real da campanha depois do primeiro disparo (o que a pausa teria evitado). */
  spendAfterTrigger: number;
  /** Último orçamento diário conhecido (para estimar impacto de ajuste de orçamento). */
  lastDailyBudget: number | null;
};

export type SimulateRuleResult =
  | { supported: false; reason: "schedule" | "plan" }
  | {
      supported: true;
      days: number;
      evaluatedCampaigns: number;
      campaigns: SimulatedCampaign[];
      totals: {
        campaignsTriggered: number;
        /** Soma de dias-disparo (equivale a alertas com dedup diário do motor). */
        alertDays: number;
        /** Só para `pause_campaign`: gasto que teria sido evitado. */
        avoidedSpend: number;
        /** Só para `adjust_budget_percent`: acréscimo diário estimado de orçamento. */
        dailyBudgetIncrease: number;
      };
    };

const WINDOW_DAYS = 7;

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export async function simulateRule(
  tenantId: string,
  input: SimulateRuleInput
): Promise<SimulateRuleResult> {
  // Regras de agenda dependem de dados por hora, que os snapshots diários não têm.
  if (input.condition.schedule) return { supported: false, reason: "schedule" };

  const groups = normalizeConditionGroups(input.condition);
  if (!groups.length) {
    return {
      supported: true,
      days: input.days ?? 30,
      evaluatedCampaigns: 0,
      campaigns: [],
      totals: { campaignsTriggered: 0, alertDays: 0, avoidedSpend: 0, dailyBudgetIncrease: 0 }
    };
  }

  const days = Math.min(Math.max(input.days ?? 30, 7), 90);
  const { adAccount: adRepo, campaignMetricSnapshot: campRepo, client: clientRepo } =
    await repositories();

  // Mesmo escopo do motor: contas do cliente da regra, ou todas as contas do tenant.
  const tenantClients = await clientRepo.find({ where: { tenantId } });
  const tenantClientIds = tenantClients.map((c) => c.id);
  const scopedClientIds = input.clientId
    ? tenantClientIds.filter((id) => id === input.clientId)
    : tenantClientIds;
  if (!scopedClientIds.length) {
    return {
      supported: true,
      days,
      evaluatedCampaigns: 0,
      campaigns: [],
      totals: { campaignsTriggered: 0, alertDays: 0, avoidedSpend: 0, dailyBudgetIncrease: 0 }
    };
  }

  const accounts = await adRepo.find({ where: { clientId: In(scopedClientIds) } });
  const accountIds = accounts.map((a) => a.id);
  if (!accountIds.length) {
    return {
      supported: true,
      days,
      evaluatedCampaigns: 0,
      campaigns: [],
      totals: { campaignsTriggered: 0, alertDays: 0, avoidedSpend: 0, dailyBudgetIncrease: 0 }
    };
  }

  // Precisa dos 7 dias anteriores ao primeiro dia simulado para a primeira janela.
  const since = isoDaysAgo(days + WINDOW_DAYS);
  const today = isoDaysAgo(0);
  const rows = await campRepo.find({
    where: { adAccountId: In(accountIds), day: Between(since, today) },
    order: { day: "ASC" }
  });

  const byCampaign = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = byCampaign.get(r.metaCampaignId) ?? [];
    list.push(r);
    byCampaign.set(r.metaCampaignId, list);
  }

  const replayDays: string[] = [];
  for (let i = days - 1; i >= 0; i--) replayDays.push(isoDaysAgo(i));

  const evalClause = (
    c: { metric?: string; op?: string; value?: number },
    metricValues: Record<string, number>
  ) => {
    const metricVal = metricValues[c.metric ?? ""] ?? 0;
    const threshold = c.value ?? 0;
    return c.op === "gt"
      ? metricVal > threshold
      : c.op === "lt"
        ? metricVal < threshold
        : metricVal >= threshold;
  };

  const minSpend = input.condition.minSpend;
  const triggered: SimulatedCampaign[] = [];
  let alertDays = 0;

  for (const [metaCampaignId, snaps] of byCampaign) {
    let firstTriggerDay: string | null = null;
    let daysTriggered = 0;

    for (const day of replayDays) {
      const windowStart = new Date(`${day}T00:00:00Z`);
      windowStart.setUTCDate(windowStart.getUTCDate() - WINDOW_DAYS);
      const windowStartIso = windowStart.toISOString().slice(0, 10);
      const window = snaps.filter((s) => s.day >= windowStartIso && s.day <= day);
      if (!window.length) continue;

      // Mesma agregação do motor: soma spend/conversões/impressões/cliques; CPL e ROAS
      // como média dos dias com valor.
      let spend = 0;
      let conversions = 0;
      let impressions = 0;
      let clicks = 0;
      let cplSum = 0;
      let cplN = 0;
      let roasSum = 0;
      let roasN = 0;
      for (const s of window) {
        spend += num(s.spend);
        conversions += num(s.conversions);
        impressions += num(s.impressions);
        clicks += num(s.clicks);
        const leads = num(s.leads);
        if (leads > 0) {
          cplSum += num(s.spend) / leads;
          cplN += 1;
        }
        const roas = num(s.roas);
        if (roas > 0) {
          roasSum += roas;
          roasN += 1;
        }
      }
      const metricValues: Record<string, number> = {
        cpl: cplN ? cplSum / cplN : 0,
        roas: roasN ? roasSum / roasN : 0,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        cpa: conversions > 0 ? spend / conversions : 0,
        spend,
        conversions
      };

      if (minSpend && spend < minSpend) continue;

      const hit = groups.some((g) => g.every((c) => evalClause(c, metricValues)));
      if (!hit) continue;

      daysTriggered += 1;
      if (!firstTriggerDay) firstTriggerDay = day;
    }

    if (!firstTriggerDay) continue;
    alertDays += daysTriggered;

    const after = snaps.filter((s) => s.day > firstTriggerDay!);
    const spendAfterTrigger = after.reduce((sum, s) => sum + num(s.spend), 0);
    const last = snaps[snaps.length - 1];
    triggered.push({
      metaCampaignId,
      campaignName: last?.campaignName ?? null,
      firstTriggerDay,
      daysTriggered,
      spendAfterTrigger,
      lastDailyBudget: last?.dailyBudget != null ? num(last.dailyBudget) : null
    });
  }

  triggered.sort((a, b) => b.spendAfterTrigger - a.spendAfterTrigger);

  const isPause = input.action.type === "pause_campaign";
  const isBudget = input.action.type === "adjust_budget_percent";
  const pct = input.action.budgetPercent ?? 10;

  return {
    supported: true,
    days,
    evaluatedCampaigns: byCampaign.size,
    campaigns: triggered,
    totals: {
      campaignsTriggered: triggered.length,
      alertDays,
      avoidedSpend: isPause
        ? triggered.reduce((sum, c) => sum + c.spendAfterTrigger, 0)
        : 0,
      dailyBudgetIncrease: isBudget
        ? triggered.reduce((sum, c) => sum + (c.lastDailyBudget ?? 0) * (pct / 100), 0)
        : 0
    }
  };
}
