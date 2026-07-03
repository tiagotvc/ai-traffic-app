import { num } from "@/lib/goal-types";

/**
 * Avaliação compartilhada do motor de regras: a MESMA agregação e a MESMA semântica de
 * janela para o caminho de campanha, o caminho por conjunto/anúncio e o backtest —
 * qualquer divergência entre motor e simulação nasce aqui, então aqui é o único lugar.
 *
 * Janela (Sprint 2 da régua): `windowDays` = tamanho da janela móvel de agregação
 * (1 = só o dia, 3/7/14 = acumulado); `consecutiveDays` = a condição precisa ser
 * verdadeira em N dias SEGUIDOS (cada dia avaliado com a própria janela móvel) — é o
 * anti-"pausar anúncio bom por um dia ruim".
 */

export type DailyMetricRow = {
  day: string;
  spend: string | number;
  conversions: string | number;
  impressions: string | number;
  clicks: string | number;
  leads: string | number;
  roas: string | number;
  reach: string | number;
};

export type ConditionClause = { metric?: string; op?: string; value?: number };

export type WindowSpec = { windowDays: number; consecutiveDays: number };

const ALLOWED_WINDOWS = [1, 3, 7, 14];

export function normalizeWindow(cond: {
  windowDays?: number;
  consecutiveDays?: number;
}): WindowSpec {
  const windowDays = ALLOWED_WINDOWS.includes(Number(cond.windowDays))
    ? Number(cond.windowDays)
    : 7;
  const consecutiveDays = Math.min(7, Math.max(1, Math.round(Number(cond.consecutiveDays) || 1)));
  return { windowDays, consecutiveDays };
}

export function isoAddDays(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** Agregação canônica de uma janela: somas + médias dos dias com valor (CPL/ROAS). */
export function aggregateMetricValues(rows: DailyMetricRow[]): Record<string, number> {
  let spend = 0;
  let conversions = 0;
  let impressions = 0;
  let clicks = 0;
  let reach = 0;
  let cplSum = 0;
  let cplN = 0;
  let roasSum = 0;
  let roasN = 0;
  for (const r of rows) {
    spend += num(r.spend);
    conversions += num(r.conversions);
    impressions += num(r.impressions);
    clicks += num(r.clicks);
    reach += num(r.reach);
    const leads = num(r.leads);
    if (leads > 0) {
      cplSum += num(r.spend) / leads;
      cplN += 1;
    }
    const roas = num(r.roas);
    if (roas > 0) {
      roasSum += roas;
      roasN += 1;
    }
  }
  return {
    spend,
    conversions,
    clicks,
    cpl: cplN ? cplSum / cplN : 0,
    cpa: conversions > 0 ? spend / conversions : 0,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    roas: roasN ? roasSum / roasN : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    frequency: reach > 0 ? impressions / reach : 0
  };
}

export function evalClause(c: ConditionClause, metricValues: Record<string, number>): boolean {
  const metricVal = metricValues[c.metric ?? ""] ?? 0;
  const threshold = c.value ?? 0;
  return c.op === "gt"
    ? metricVal > threshold
    : c.op === "lt"
      ? metricVal < threshold
      : metricVal >= threshold;
}

/** Forma DNF do motor: E dentro do grupo, OU entre grupos. */
export function dnfHit(
  groups: ConditionClause[][],
  metricValues: Record<string, number>
): boolean {
  return groups.some((g) => g.every((c) => evalClause(c, metricValues)));
}

/**
 * Avalia se a condição vale no dia `endDay` E nos `consecutiveDays - 1` dias anteriores,
 * cada um com a própria janela móvel de `windowDays`. Retorna também os valores da janela
 * mais recente (para a descrição legível do disparo).
 */
export function windowedHit(args: {
  rows: DailyMetricRow[];
  groups: ConditionClause[][];
  minSpend?: number;
  spec: WindowSpec;
  endDay: string;
}): { hit: boolean; metricValues: Record<string, number> } {
  const { rows, groups, minSpend, spec, endDay } = args;
  let latestMetricValues: Record<string, number> = {};

  for (let k = 0; k < spec.consecutiveDays; k += 1) {
    const day = isoAddDays(endDay, -k);
    const windowStart = isoAddDays(day, -(spec.windowDays - 1));
    const window = rows.filter((r) => r.day >= windowStart && r.day <= day);
    if (!window.length) return { hit: false, metricValues: latestMetricValues };

    const metricValues = aggregateMetricValues(window);
    if (k === 0) latestMetricValues = metricValues;

    if (minSpend && metricValues.spend < minSpend) {
      return { hit: false, metricValues: latestMetricValues };
    }
    if (!dnfHit(groups, metricValues)) {
      return { hit: false, metricValues: latestMetricValues };
    }
  }

  return { hit: true, metricValues: latestMetricValues };
}

/** Descrição legível do disparo ("cpa=62.00 (limite 50) e ..." ou grupos em OU). */
export function describeHit(
  groups: ConditionClause[][],
  metricValues: Record<string, number>
): string {
  return groups
    .map((g) => {
      const text = g
        .map((c) => `${c.metric}=${(metricValues[c.metric ?? ""] ?? 0).toFixed(2)} (limite ${c.value ?? 0})`)
        .join(" e ");
      return g.length > 1 && groups.length > 1 ? `(${text})` : text;
    })
    .join(" ou ");
}
