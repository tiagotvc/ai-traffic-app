import type { LucideIcon } from "lucide-react";
import { Target, TrendingUp } from "lucide-react";

export type UxReportMonth = { month: string; spend: number; conversions: number; roas: number };
export type UxClientSpend = { name: string; value: number; color: string };
export type UxReportListItem = {
  id: string;
  name: string;
  date: string;
  type: string;
  size: string;
  status: "ready" | "generating";
};
export type UxReportKpi = {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
  sub: string;
};

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function fmtMoney(v: number, locale: string) {
  if (v >= 1000) return `R$${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}K`;
  return new Intl.NumberFormat(locale, { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}

function fmtNum(v: number, locale: string) {
  return new Intl.NumberFormat(locale).format(Math.round(v));
}

export function toMonthlyChartData(
  series: Array<{ day: string; spend?: number; conversions?: number; roas?: number }>
): UxReportMonth[] {
  const buckets = new Map<string, { spend: number; conversions: number; roasSum: number; roasN: number }>();
  for (const p of series) {
    const d = new Date(p.day);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const cur = buckets.get(key) ?? { spend: 0, conversions: 0, roasSum: 0, roasN: 0 };
    cur.spend += p.spend ?? 0;
    cur.conversions += p.conversions ?? 0;
    if (p.roas != null && p.roas > 0) {
      cur.roasSum += p.roas;
      cur.roasN += 1;
    }
    buckets.set(key, cur);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-5)
    .map(([key, v]) => {
      const [, m] = key.split("-");
      return {
        month: MONTHS[Number(m) - 1] ?? m,
        spend: Math.round(v.spend),
        conversions: Math.round(v.conversions),
        roas: v.roasN ? v.roasSum / v.roasN : 0
      };
    });
}

export function toClientSpendBreakdown(
  campaigns: Array<{ clientName: string; spend: number }>,
  colors: string[]
): UxClientSpend[] {
  const totals = new Map<string, number>();
  for (const c of campaigns) {
    totals.set(c.clientName, (totals.get(c.clientName) ?? 0) + c.spend);
  }
  const totalSpend = [...totals.values()].reduce((a, b) => a + b, 0) || 1;
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, spend], i) => ({
      name,
      value: Math.round((spend / totalSpend) * 1000) / 10,
      color: colors[i % colors.length] ?? "#94a3b8"
    }));
}

export function toReportList(
  schedules: Array<{
    id: string;
    name: string;
    frequency: string;
    format: string;
    enabled: boolean;
    lastRunAt: string | null;
    nextRunAt: string | null;
  }>,
  locale: string
): UxReportListItem[] {
  const freqLabel: Record<string, string> = {
    daily: "Diário",
    weekly: "Semanal",
    monthly: "Mensal"
  };
  return schedules.map((s) => ({
    id: s.id,
    name: s.name,
    date: s.lastRunAt
      ? new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" }).format(new Date(s.lastRunAt))
      : s.nextRunAt
        ? new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" }).format(new Date(s.nextRunAt))
        : "—",
    type: freqLabel[s.frequency] ?? s.frequency,
    size: s.format === "whatsapp" ? "WhatsApp" : "PDF",
    status: s.enabled ? "ready" : "generating"
  }));
}

export function toReportKpis(
  summary: { spend?: number; conversions?: number; roas?: number; cpl?: number; cpa?: number },
  locale: string
): UxReportKpi[] {
  const cpl = summary.cpl ?? summary.cpa ?? 0;
  return [
    {
      label: "Spend Total",
      value: fmtMoney(summary.spend ?? 0, locale),
      icon: Target,
      color: "#f5a623",
      sub: "Período selecionado"
    },
    {
      label: "Conversões",
      value: fmtNum(summary.conversions ?? 0, locale),
      icon: TrendingUp,
      color: "#10b981",
      sub: "Período selecionado"
    },
    {
      label: "ROAS Médio",
      value: summary.roas ? `${summary.roas.toFixed(1)}×` : "—",
      icon: TrendingUp,
      color: "#4f46e5",
      sub: "Período selecionado"
    },
    {
      label: "CPL Médio",
      value: cpl ? fmtMoney(cpl, locale) : "—",
      icon: Target,
      color: "#7c3aed",
      sub: "Período selecionado"
    }
  ];
}
