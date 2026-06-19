import type { MetricKey } from "@/lib/dashboard-metrics";
import { pctDelta } from "@/lib/dashboard-ranges";

export type ReportSummary = Partial<Record<MetricKey, number>>;

export type NarrativeSegment = {
  id: string;
  text: string;
};

function trendWord(delta: number | null, locale: string): string {
  if (delta === null) return locale === "en" ? "remained stable" : "permaneceu estável";
  if (Math.abs(delta) < 3) return locale === "en" ? "remained relatively stable" : "permaneceu relativamente estável";
  if (delta > 0) return locale === "en" ? "increased" : "aumentou";
  return locale === "en" ? "decreased" : "caiu";
}

function formatCount(n: number, locale: string): string {
  return Math.round(n).toLocaleString(locale === "en" ? "en-US" : "pt-BR");
}

function formatMoney(n: number, locale: string): string {
  return n.toLocaleString(locale === "en" ? "en-US" : "pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function generateReportNarrative(input: {
  locale: string;
  current: ReportSummary;
  previous: ReportSummary | null;
  goalMetric: MetricKey;
  goalLabel: string;
  periodLabel: string;
  prevPeriodLabel: string;
}): string {
  const { locale, current, previous, goalMetric, goalLabel, periodLabel, prevPeriodLabel } = input;
  const isEn = locale === "en";

  const curGoal = current[goalMetric] ?? 0;
  const prevGoal = previous?.[goalMetric] ?? 0;
  const goalDelta = previous ? pctDelta(curGoal, prevGoal) : null;

  const curSpend = current.spend ?? 0;
  const prevSpend = previous?.spend ?? 0;
  const spendDelta = previous ? pctDelta(curSpend, prevSpend) : null;

  const curCtr = current.ctr ?? 0;
  const prevCtr = previous?.ctr ?? 0;
  const ctrDelta = previous && prevCtr > 0 ? pctDelta(curCtr, prevCtr) : null;

  const parts: string[] = [];

  if (isEn) {
    parts.push(
      `In ${periodLabel}, ${goalLabel} ${trendWord(goalDelta, locale)}` +
        (previous && prevGoal > 0
          ? ` (${formatCount(curGoal, locale)} vs ${formatCount(prevGoal, locale)} in ${prevPeriodLabel}).`
          : ` (${formatCount(curGoal, locale)} total).`)
    );
    parts.push(
      `Ad spend ${trendWord(spendDelta, locale)}` +
        (previous && prevSpend > 0
          ? ` from ${formatMoney(prevSpend, locale)} to ${formatMoney(curSpend, locale)}.`
          : ` to ${formatMoney(curSpend, locale)}.`)
    );
    if (ctrDelta !== null) {
      parts.push(
        `CTR ${trendWord(ctrDelta, locale)}` +
          ` (${curCtr.toFixed(2)}% vs ${prevCtr.toFixed(2)}% previously).`
      );
    }
  } else {
    parts.push(
      `No período ${periodLabel}, ${goalLabel.toLowerCase()} ${trendWord(goalDelta, locale)}` +
        (previous && prevGoal > 0
          ? ` (fechamos com ${formatCount(curGoal, locale)} contra ${formatCount(prevGoal, locale)} no período anterior).`
          : ` (total de ${formatCount(curGoal, locale)}).`)
    );
    parts.push(
      `O valor investido nas campanhas ${trendWord(spendDelta, locale)}` +
        (previous && prevSpend > 0
          ? ` (${formatMoney(prevSpend, locale)} → ${formatMoney(curSpend, locale)}).`
          : ` (${formatMoney(curSpend, locale)}).`)
    );
    if (ctrDelta !== null) {
      parts.push(
        `A taxa de cliques (CTR) ${trendWord(ctrDelta, locale)}` +
          ` (${curCtr.toFixed(2)}% vs ${prevCtr.toFixed(2)}% no período anterior).`
      );
    }
  }

  return parts.join(" ");
}

export type ReportRecommendation = {
  id: string;
  title: string;
  body: string;
  priority: "high" | "medium" | "low";
};

export function generateReportRecommendations(input: {
  locale: string;
  current: ReportSummary;
  previous: ReportSummary | null;
  goalMetric: MetricKey;
  goalLabel: string;
  topCampaigns: Array<{ name: string; spend: number; conversions: number }>;
}): ReportRecommendation[] {
  const { locale, current, previous, goalMetric, goalLabel, topCampaigns } = input;
  const isEn = locale === "en";
  const out: ReportRecommendation[] = [];

  const curGoal = current[goalMetric] ?? 0;
  const prevGoal = previous?.[goalMetric] ?? 0;
  const goalDelta = previous && prevGoal > 0 ? pctDelta(curGoal, prevGoal) : null;

  const curSpend = current.spend ?? 0;
  const prevSpend = previous?.spend ?? 0;
  const spendDelta = previous && prevSpend > 0 ? pctDelta(curSpend, prevSpend) : null;

  const curCpa = current.cpa ?? 0;
  const prevCpa = previous?.cpa ?? 0;

  if (goalDelta !== null && goalDelta < -10) {
    out.push({
      id: "goal-down",
      title: isEn ? "Review conversion funnel" : "Revisar funil de conversão",
      body: isEn
        ? `${goalLabel} dropped compared to the previous period. Check landing pages, ad copy, and audience targeting.`
        : `${goalLabel} caiu em relação ao período anterior. Vale revisar páginas, textos dos anúncios e públicos.`,
      priority: "high"
    });
  }

  if (spendDelta !== null && spendDelta > 15 && (goalDelta === null || goalDelta < 5)) {
    out.push({
      id: "spend-up-results-flat",
      title: isEn ? "Optimize budget allocation" : "Otimizar distribuição de verba",
      body: isEn
        ? "Spend rose faster than results. Consider pausing underperforming campaigns and scaling winners."
        : "O investimento subiu mais que os resultados. Considere pausar campanhas fracas e reforçar as que performam melhor.",
      priority: "high"
    });
  }

  if (prevCpa > 0 && curCpa > prevCpa * 1.15) {
    out.push({
      id: "cpa-up",
      title: isEn ? "Watch cost per result" : "Atenção ao custo por resultado",
      body: isEn
        ? "Cost per conversion increased. Test new creatives or refine audiences before raising budgets."
        : "O custo por conversão aumentou. Teste novos criativos ou refine públicos antes de aumentar verbas.",
      priority: "medium"
    });
  }

  const top = topCampaigns[0];
  if (top && top.spend > curSpend * 0.4 && top.conversions === 0) {
    out.push({
      id: "top-spend-no-conv",
      title: isEn ? "High spend without conversions" : "Alto gasto sem conversões",
      body: isEn
        ? `"${top.name}" consumed a large share of budget with no conversions. Review or pause it.`
        : `"${top.name}" consumiu boa parte do orçamento sem conversões. Vale revisar ou pausar.`,
      priority: "high"
    });
  }

  if (out.length < 2) {
    out.push({
      id: "maintain",
      title: isEn ? "Keep monitoring" : "Manter monitoramento",
      body: isEn
        ? "Continue tracking key metrics weekly and refresh creatives that show fatigue."
        : "Continue acompanhando as métricas principais semanalmente e renove criativos que mostrarem sinais de fadiga.",
      priority: "low"
    });
  }

  return out.slice(0, 4);
}
