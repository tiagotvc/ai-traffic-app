import "server-only";

import { Between, In } from "typeorm";

import type { AlertType } from "@/db/entities/Alert";
import { repositories } from "@/db/repositories";
import { listDashboardBrainShelf } from "@/lib/agency-brain/dashboard-shelf-service";
import type { AlertCardPayload, AlertSource, AlertWidgetConfig } from "@/lib/dashboard/alert-widget-config";
import { parseAlertWidgetConfig } from "@/lib/dashboard/alert-widget-config";
import { loadMetricTotals, resolveDashboardScope } from "@/lib/dashboard-query";
import { resolveRanges } from "@/lib/dashboard-ranges";
import type { MetricKey } from "@/lib/dashboard-metrics";
import { num } from "@/lib/goal-types";
import type { PeriodState } from "@/components/PeriodFilter";

type ResolverCtx = {
  tenantId: string;
  clientFilter?: string;
  accountFilter?: string;
  period: PeriodState;
  tz?: string;
};

function fmtPct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function fmtNum(n: number, digits = 2) {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: digits });
}

function buildSeriesFromTotals(days: number, daily: Array<{ day: string; value: number }>) {
  return daily.slice(-days).map((d) => ({ date: d.day.slice(5), value: d.value }));
}

async function loadDailyMetricSeries(
  accountIds: string[],
  metricKey: MetricKey | string,
  since: string,
  until: string
): Promise<Array<{ day: string; value: number }>> {
  const { campaignMetricSnapshot: repo } = await repositories();
  if (!accountIds.length) return [];
  const rows = await repo.find({
    where: { adAccountId: In(accountIds), day: Between(since, until) },
    order: { day: "ASC" }
  });
  const byDay = new Map<string, { spend: number; impressions: number; clicks: number; conversions: number; roasSum: number; roasN: number }>();
  for (const r of rows) {
    const cur = byDay.get(r.day) ?? { spend: 0, impressions: 0, clicks: 0, conversions: 0, roasSum: 0, roasN: 0 };
    cur.spend += num(r.spend);
    cur.impressions += num(r.impressions);
    cur.clicks += num(r.clicks);
    cur.conversions += num(r.conversions);
    const roas = num(r.roas);
    if (roas > 0) {
      cur.roasSum += roas;
      cur.roasN += 1;
    }
    byDay.set(r.day, cur);
  }
  return [...byDay.entries()].map(([day, agg]) => {
    let value = 0;
    if (metricKey === "spend") value = agg.spend;
    else if (metricKey === "conversions") value = agg.conversions;
    else if (metricKey === "roas") value = agg.roasN ? agg.roasSum / agg.roasN : 0;
    else if (metricKey === "ctr") value = agg.impressions > 0 ? (agg.clicks / agg.impressions) * 100 : 0;
    else if (metricKey === "cpa" || metricKey === "cpl") value = agg.conversions > 0 ? agg.spend / agg.conversions : 0;
    else if (metricKey === "cpc") value = agg.clicks > 0 ? agg.spend / agg.clicks : 0;
    return { day, value };
  });
}

function impactLabel(impact: string) {
  if (impact === "HIGH") return "Impacto alto";
  if (impact === "MEDIUM") return "Impacto médio";
  return "Impacto baixo";
}

function confidenceLabel(confidence: string, score: number | null) {
  const map: Record<string, string> = { HIGH: "Alta", MEDIUM: "Média", LOW: "Baixa" };
  const base = map[confidence] ?? confidence;
  return score != null ? `Confiança: ${base} (${Math.round(score)}%)` : `Confiança: ${base}`;
}

async function resolveLearningSource(
  source: Extract<AlertSource, { kind: "learning" }>,
  ctx: ResolverCtx
): Promise<AlertCardPayload> {
  const items = await listDashboardBrainShelf(ctx.tenantId, 12);
  const pick =
    source.learningId && source.learningId !== "latest"
      ? items.find((x) => x.id === source.learningId)
      : items[0];
  if (!pick) {
    return {
      categoryLabel: "Alerta de aprendizado",
      headline: "Nenhum aprendizado disponível",
      description: "O Brain ainda não gerou insights para exibir aqui.",
      badgeTone: "info",
      status: "ok"
    };
  }
  const delta = pick.evidence?.deltaPercent;
  const series = Array.from({ length: 14 }, (_, i) => ({
    date: `${i + 1}`,
    value: 40 + Math.sin(i / 2) * 8 + (delta ?? 0) * 0.2
  }));
  const comp = series.map((p, i) => ({ ...p, value: 35 + Math.cos(i / 3) * 5 }));
  return {
    categoryLabel: "Alerta de aprendizado",
    headline: pick.title,
    description: pick.description,
    badgeLabel: impactLabel(pick.impact),
    badgeTone: pick.impact === "HIGH" ? "critical" : pick.impact === "MEDIUM" ? "warning" : "success",
    impactLabel: impactLabel(pick.impact),
    confidenceLabel: confidenceLabel(pick.confidence, pick.confidenceScore),
    deltaLabel: delta != null ? fmtPct(delta) : undefined,
    deltaTrend: delta != null ? (delta >= 0 ? "up" : "down") : "neutral",
    series,
    comparisonSeries: comp,
    comparisonLabel: "Benchmark",
    status: "ok",
    actionHref: `/agency-brain/learnings/${pick.id}`,
    actionLabel: "Ver detalhes"
  };
}

async function resolveGoalSource(
  alertType: AlertType,
  ctx: ResolverCtx
): Promise<AlertCardPayload> {
  const { alert: alertRepo } = await repositories();
  const row = await alertRepo.findOne({
    where: { tenantId: ctx.tenantId, type: alertType, dismissed: false },
    order: { createdAt: "DESC" }
  });
  const { current } = resolveRanges(ctx.period, ctx.tz);
  const { accountIds } = await resolveDashboardScope(
    ctx.tenantId,
    ctx.clientFilter ?? "",
    ctx.accountFilter ?? ""
  );
  const days = 14;
  const since = current?.since ?? new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const until = current?.until ?? new Date().toISOString().slice(0, 10);
  const metricKey: MetricKey =
    alertType === "CTR_BELOW_MIN"
      ? "ctr"
      : alertType === "ROAS_BELOW_MIN" || alertType === "ROAS_ABOVE_TARGET"
        ? "roas"
        : alertType === "BUDGET_NEAR_LIMIT"
          ? "spend"
          : alertType === "CONVERSION_DROP" || alertType === "SPEND_NO_CONVERSION"
            ? "conversions"
            : "cpa";
  const daily = await loadDailyMetricSeries(accountIds, metricKey, since, until);
  const series = buildSeriesFromTotals(days, daily);
  const last = series.at(-1)?.value ?? 0;
  const threshold = row?.thresholdValue ? num(row.thresholdValue) : undefined;

  return {
    categoryLabel: alertType === "BUDGET_NEAR_LIMIT" ? "Alerta de limites" : "Alerta de meta",
    headline: row?.title ?? `Monitorando ${metricKey.toUpperCase()}`,
    description: row?.description ?? "Aguardando dados de campanha para avaliar a meta.",
    metricLabel: metricKey.toUpperCase(),
    metricValue: fmtNum(last, metricKey === "ctr" ? 2 : 2),
    deltaLabel: row?.actualValue && row?.thresholdValue ? fmtPct(((num(row.actualValue) - num(row.thresholdValue)) / Math.max(num(row.thresholdValue), 0.01)) * 100) : undefined,
    deltaTrend: "down",
    badgeLabel: row ? "Alerta" : "Monitorando",
    badgeTone: row?.severity === "critical" ? "critical" : row ? "warning" : "info",
    thresholdLabel: threshold != null ? `Meta ${fmtNum(threshold)}` : undefined,
    thresholdValue: threshold,
    series,
    status: row ? "triggered" : "monitoring",
    actionHref: "/alerts",
    actionLabel: "Ver detalhes"
  };
}

async function resolveVariationSource(
  metricKey: MetricKey,
  ctx: ResolverCtx
): Promise<AlertCardPayload> {
  const { current, previous } = resolveRanges(ctx.period, ctx.tz);
  const { accountIds } = await resolveDashboardScope(
    ctx.tenantId,
    ctx.clientFilter ?? "",
    ctx.accountFilter ?? ""
  );
  const days = 14;
  const cur = current
    ? await loadMetricTotals(accountIds, days, { since: current.since, until: current.until })
    : null;
  const prev = previous
    ? await loadMetricTotals(accountIds, days, { since: previous.since, until: previous.until })
    : null;
  const curVal =
    metricKey === "ctr"
      ? cur && cur.impressions > 0
        ? (cur.clicks / cur.impressions) * 100
        : 0
      : metricKey === "cpa"
        ? cur && cur.conversions > 0
          ? cur.spend / cur.conversions
          : 0
        : cur
          ? (cur[metricKey as keyof typeof cur] as number) ?? 0
          : 0;
  const prevVal =
    metricKey === "ctr"
      ? prev && prev.impressions > 0
        ? (prev.clicks / prev.impressions) * 100
        : 0
      : metricKey === "cpa"
        ? prev && prev.conversions > 0
          ? prev.spend / prev.conversions
          : 0
        : prev
          ? (prev[metricKey as keyof typeof prev] as number) ?? 0
          : 0;
  const delta = prevVal ? ((curVal - prevVal) / prevVal) * 100 : 0;
  const since = current?.since ?? new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const until = current?.until ?? new Date().toISOString().slice(0, 10);
  const daily = await loadDailyMetricSeries(accountIds, metricKey, since, until);
  return {
    categoryLabel: "Variação anômala",
    headline: `${metricKey.toUpperCase()} ${fmtPct(delta)} vs período anterior`,
    description: "Detectamos uma variação relevante na métrica selecionada.",
    metricLabel: metricKey.toUpperCase(),
    metricValue: fmtNum(curVal, 2),
    deltaLabel: fmtPct(delta),
    deltaTrend: delta >= 0 ? "up" : "down",
    badgeLabel: Math.abs(delta) >= 40 ? "Alerta" : "Atenção",
    badgeTone: Math.abs(delta) >= 40 ? "critical" : "warning",
    series: buildSeriesFromTotals(days, daily),
    status: Math.abs(delta) >= 20 ? "triggered" : "monitoring",
    actionHref: "/alerts",
    actionLabel: "Ver detalhes"
  };
}

async function resolveAutomationSource(
  ruleId: string,
  ctx: ResolverCtx
): Promise<AlertCardPayload> {
  const { automationRule: ruleRepo, campaignMetricSnapshot: campRepo, adAccount: adRepo, alert: alertRepo } =
    await repositories();
  const rule = await ruleRepo.findOne({ where: { id: ruleId, tenantId: ctx.tenantId } });
  if (!rule) {
    return {
      categoryLabel: "Automação",
      headline: "Regra não encontrada",
      description: "Selecione outra automação ou crie uma nova.",
      badgeTone: "info",
      status: "ok"
    };
  }
  const cond = rule.condition as { metric?: string; op?: string; value?: number; minSpend?: number };
  const metric = (cond.metric ?? "spend") as string;
  const accounts = rule.clientId
    ? await adRepo.find({ where: { clientId: rule.clientId } })
    : await adRepo.find();
  const accountIds = accounts.map((a) => a.id);
  const since = new Date(Date.now() - 13 * 86400000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const rows = accountIds.length
    ? await campRepo.find({ where: { adAccountId: In(accountIds), day: Between(since, today) } })
    : [];
  let spend = 0;
  let conversions = 0;
  let impressions = 0;
  let clicks = 0;
  let roasSum = 0;
  let roasN = 0;
  let cplSum = 0;
  let cplN = 0;
  for (const s of rows) {
    spend += num(s.spend);
    conversions += num(s.conversions);
    impressions += num(s.impressions);
    clicks += num(s.clicks);
    const roas = num(s.roas);
    if (roas > 0) {
      roasSum += roas;
      roasN += 1;
    }
    const leads = num(s.leads);
    if (leads > 0) {
      cplSum += num(s.spend) / leads;
      cplN += 1;
    }
  }
  const cpl = cplN ? cplSum / cplN : 0;
  const roas = roasN ? roasSum / roasN : 0;
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cpa = conversions > 0 ? spend / conversions : 0;
  let metricVal = 0;
  if (metric === "cpl") metricVal = cpl;
  else if (metric === "spend") metricVal = spend;
  else if (metric === "conversions") metricVal = conversions;
  else if (metric === "roas") metricVal = roas;
  else if (metric === "ctr") metricVal = ctr;
  else if (metric === "cpa") metricVal = cpa;

  const threshold = cond.value ?? 0;
  const hit =
    cond.op === "gt"
      ? metricVal > threshold
      : cond.op === "lt"
        ? metricVal < threshold
        : metricVal >= threshold;

  const fired = await alertRepo.findOne({
    where: { tenantId: ctx.tenantId, automationRuleId: ruleId, dismissed: false },
    order: { createdAt: "DESC" }
  });

  const daily = await loadDailyMetricSeries(accountIds, metric, since, today);
  const series = buildSeriesFromTotals(14, daily);

  return {
    categoryLabel: "Monitor de automação",
    headline: rule.name,
    description: `${metric.toUpperCase()} atual: ${fmtNum(metricVal)} · limite ${cond.op ?? "gte"} ${fmtNum(threshold)}`,
    metricLabel: metric.toUpperCase(),
    metricValue: fmtNum(metricVal, 2),
    badgeLabel: hit || fired ? "Disparado" : "Monitorando",
    badgeTone: hit || fired ? "critical" : "success",
    thresholdLabel: `Limite ${fmtNum(threshold)}`,
    thresholdValue: threshold,
    series,
    status: hit || fired ? "triggered" : "monitoring",
    actionHref: "/automations",
    actionLabel: "Ver automação"
  };
}

function resolveLearningPhasePlaceholder(): AlertCardPayload {
  return {
    categoryLabel: "Fase de aprendizado",
    headline: "O Brain está aprendendo",
    description: "Em breve: acompanhamento da fase de aprendizado das campanhas Meta.",
    progressPercent: 62,
    progressHint: "Estimativa de conclusão: em breve",
    badgeLabel: "Em breve",
    badgeTone: "info",
    series: Array.from({ length: 14 }, (_, i) => ({ date: `${i + 1}`, value: 40 + i * 2 })),
    comparisonSeries: Array.from({ length: 14 }, (_, i) => ({ date: `${i + 1}`, value: 35 + i * 1.5 })),
    status: "ok"
  };
}

export async function resolveAlertCardData(
  configInput: Record<string, unknown> | AlertWidgetConfig,
  ctx: ResolverCtx
): Promise<AlertCardPayload> {
  const config =
    "source" in configInput && "template" in configInput
      ? (configInput as AlertWidgetConfig)
      : parseAlertWidgetConfig(configInput);

  switch (config.source.kind) {
    case "learning":
      return resolveLearningSource(config.source, ctx);
    case "goal":
      return resolveGoalSource(config.source.alertType, ctx);
    case "variation":
      return resolveVariationSource(config.source.metricKey, ctx);
    case "automation":
      return resolveAutomationSource(config.source.ruleId, ctx);
    case "learning_phase":
      return resolveLearningPhasePlaceholder();
    default:
      return resolveGoalSource("ROAS_BELOW_MIN", ctx);
  }
}
