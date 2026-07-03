import "server-only";

import { Between, In } from "typeorm";

import { repositories } from "@/db/repositories";
import { num } from "@/lib/goal-types";
import { normalizeConditionGroups } from "@/lib/automation/rule-templates";
import { aggregateMetricValues, dnfHit, isoAddDays, normalizeWindow } from "@/lib/automation/evaluate";

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
    windowDays?: number;
    consecutiveDays?: number;
  };
  action: { type: string; budgetPercent?: number };
  clientId?: string | null;
  /** Escopo da regra — o backtest só cobre `campaign` por enquanto. */
  level?: string | null;
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
  | { supported: false; reason: "schedule" | "plan" | "level" }
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
  if (input.level && input.level !== "campaign") return { supported: false, reason: "level" };

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

  const spec = normalizeWindow(input.condition);
  // Histórico extra: janela móvel + dias consecutivos antes do primeiro dia simulado.
  const since = isoDaysAgo(days + spec.windowDays + spec.consecutiveDays);
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

  const minSpend = input.condition.minSpend;
  const triggered: SimulatedCampaign[] = [];
  let alertDays = 0;

  for (const [metaCampaignId, snaps] of byCampaign) {
    let firstTriggerDay: string | null = null;
    let daysTriggered = 0;

    // 1) Em quais dias a condição valeu (cada dia com a própria janela móvel)?
    //    Avalia também os (consecutiveDays - 1) dias ANTES do período simulado, para o
    //    primeiro dia do replay poder verificar a sequência completa.
    const hitDays = new Set<string>();
    const evalDays: string[] = [];
    for (let k = spec.consecutiveDays - 1; k >= 1; k -= 1) {
      evalDays.push(isoAddDays(replayDays[0]!, -k));
    }
    evalDays.push(...replayDays);
    for (const day of evalDays) {
      const windowStart = isoAddDays(day, -(spec.windowDays - 1));
      const window = snaps.filter((sn) => sn.day >= windowStart && sn.day <= day);
      if (!window.length) continue;
      const metricValues = aggregateMetricValues(window);
      if (minSpend && metricValues.spend < minSpend) continue;
      if (dnfHit(groups, metricValues)) hitDays.add(day);
    }

    // 2) Um "disparo" no dia D exige a condição valendo em D e nos N-1 dias anteriores.
    for (const day of replayDays) {
      let sequence = true;
      for (let k = 0; k < spec.consecutiveDays; k += 1) {
        if (!hitDays.has(isoAddDays(day, -k))) {
          sequence = false;
          break;
        }
      }
      if (!sequence) continue;
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
