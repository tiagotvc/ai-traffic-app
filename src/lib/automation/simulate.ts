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
  /** Conversões reais DEPOIS do primeiro disparo — o que uma pausa teria perdido. */
  conversionsAfterTrigger: number;
  /** Falso positivo: recuperou (≥2 conversões) depois do gatilho — a pausa teria errado. */
  falsePositive: boolean;
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
        /** Alvos que recuperaram (≥2 conversões) após o gatilho — pausas que teriam errado. */
        falsePositives: number;
        /** % das conversões do período que uma pausa NÃO teria perdido (100 = nenhuma perdida). */
        conversionsPreservedPct: number;
        /** Score determinístico 30–95 (volume de disparos × taxa de falso positivo). */
        confidence: number;
        confidenceReasons: string[];
        confidenceRisks: string[];
      };
    };

function emptyTotals() {
  return {
    campaignsTriggered: 0,
    alertDays: 0,
    avoidedSpend: 0,
    dailyBudgetIncrease: 0,
    falsePositives: 0,
    conversionsPreservedPct: 100,
    confidence: 50,
    confidenceReasons: ["Sem dados suficientes no período."],
    confidenceRisks: []
  };
}

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
  const level = input.level === "adset" || input.level === "ad" ? input.level : "campaign";

  const groups = normalizeConditionGroups(input.condition);
  if (!groups.length) {
    return {
      supported: true,
      days: input.days ?? 30,
      evaluatedCampaigns: 0,
      campaigns: [],
      totals: emptyTotals()
    };
  }

  const days = Math.min(Math.max(input.days ?? 30, 7), 90);
  const {
    adAccount: adRepo,
    campaignMetricSnapshot: campRepo,
    adMetricSnapshot: adSnapRepo,
    client: clientRepo
  } = await repositories();

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
      totals: emptyTotals()
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
      totals: emptyTotals()
    };
  }

  const spec = normalizeWindow(input.condition);
  // Histórico extra: janela móvel + dias consecutivos antes do primeiro dia simulado.
  const since = isoDaysAgo(days + spec.windowDays + spec.consecutiveDays);
  const today = isoDaysAgo(0);

  // Linha unificada: o replay é idêntico para campanha, conjunto e anúncio — muda só a
  // fonte (CampaignMetricSnapshot vs AdMetricSnapshot) e a chave de agrupamento.
  type SimRow = {
    day: string;
    spend: string | number;
    conversions: string | number;
    impressions: string | number;
    clicks: string | number;
    leads: string | number;
    roas: string | number;
    reach: string | number;
    name: string | null;
    dailyBudget: string | null;
  };
  const byCampaign = new Map<string, SimRow[]>();

  if (level === "campaign") {
    const rows = await campRepo.find({
      where: { adAccountId: In(accountIds), day: Between(since, today) },
      order: { day: "ASC" }
    });
    for (const r of rows) {
      const list = byCampaign.get(r.metaCampaignId) ?? [];
      list.push({
        day: r.day,
        spend: r.spend,
        conversions: r.conversions,
        impressions: r.impressions,
        clicks: r.clicks,
        leads: r.leads,
        roas: r.roas,
        reach: r.reach,
        name: r.campaignName ?? null,
        dailyBudget: r.dailyBudget ?? null
      });
      byCampaign.set(r.metaCampaignId, list);
    }
  } else {
    const rows = await adSnapRepo.find({
      where: { adAccountId: In(accountIds), day: Between(since, today) },
      order: { day: "ASC" }
    });
    for (const r of rows) {
      const targetId = level === "adset" ? r.metaAdsetId : r.metaAdId;
      if (!targetId) continue;
      const list = byCampaign.get(targetId) ?? [];
      list.push({
        day: r.day,
        spend: r.spend,
        conversions: r.conversions,
        impressions: r.impressions,
        clicks: r.clicks,
        leads: r.leads,
        roas: r.roas,
        reach: r.reach,
        name: (level === "adset" ? r.adsetName : r.adName) ?? null,
        dailyBudget: null // conjuntos/anúncios não têm orçamento no snapshot
      });
      byCampaign.set(targetId, list);
    }
  }

  const replayDays: string[] = [];
  for (let i = days - 1; i >= 0; i--) replayDays.push(isoDaysAgo(i));

  const minSpend = input.condition.minSpend;
  const triggered: SimulatedCampaign[] = [];
  let alertDays = 0;
  let totalPeriodConversions = 0;

  for (const [metaCampaignId, snaps] of byCampaign) {
    totalPeriodConversions += snaps
      .filter((sn) => sn.day >= replayDays[0]!)
      .reduce((sum, sn) => sum + num(sn.conversions), 0);

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
    const conversionsAfterTrigger = after.reduce((sum, s) => sum + num(s.conversions), 0);
    const last = snaps[snaps.length - 1];
    triggered.push({
      metaCampaignId,
      campaignName: last?.name ?? null,
      firstTriggerDay,
      daysTriggered,
      spendAfterTrigger,
      conversionsAfterTrigger,
      // Recuperou de verdade (≥2 conversões) depois do gatilho: a pausa teria errado.
      falsePositive: conversionsAfterTrigger >= 2,
      lastDailyBudget: last?.dailyBudget != null ? num(last.dailyBudget) : null
    });
  }

  triggered.sort((a, b) => b.spendAfterTrigger - a.spendAfterTrigger);

  const isPause = input.action.type === "pause_campaign";
  const isBudget = input.action.type === "adjust_budget_percent";
  const pct = input.action.budgetPercent ?? 10;

  // Falso positivo e conversões preservadas só fazem sentido quando a ação removeria
  // entrega (pausa). Para as demais ações, o score considera apenas o volume de dados.
  const falsePositives = isPause ? triggered.filter((c) => c.falsePositive).length : 0;
  const lostConversions = isPause
    ? triggered.reduce((sum, c) => sum + c.conversionsAfterTrigger, 0)
    : 0;
  const conversionsPreservedPct =
    totalPeriodConversions > 0
      ? Math.round(((totalPeriodConversions - lostConversions) / totalPeriodConversions) * 1000) / 10
      : 100;

  // Score determinístico e explicável: parte de 95, desconta taxa de falso positivo e
  // amostra pequena. Sem LLM — os números vêm do próprio replay.
  const fpRate = triggered.length ? falsePositives / triggered.length : 0;
  const samplePenalty =
    triggered.length === 0 ? 30 : triggered.length < 3 ? 15 : triggered.length < 6 ? 8 : 0;
  const confidence = Math.round(Math.min(95, Math.max(30, 95 - fpRate * 50 - samplePenalty)));

  const confidenceReasons = [
    `${alertDays} dia(s)-disparo em ${days} dias de histórico`,
    `${triggered.length} de ${byCampaign.size} alvo(s) avaliados dispararam`,
    ...(isPause && falsePositives === 0 && triggered.length > 0
      ? ["Nenhum alvo recuperou depois do gatilho."]
      : [])
  ];
  const confidenceRisks = [
    ...(falsePositives > 0
      ? [`${falsePositives} alvo(s) voltaram a converter após o gatilho (conversões tardias).`]
      : []),
    ...(triggered.length > 0 && triggered.length < 3
      ? ["Poucos disparos históricos — considere observar por mais alguns dias."]
      : [])
  ];

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
        : 0,
      falsePositives,
      conversionsPreservedPct,
      confidence,
      confidenceReasons,
      confidenceRisks
    }
  };
}
