import type { LucideIcon } from "lucide-react";
import { BarChart2, DollarSign, Eye, MousePointerClick, TrendingUp, Zap } from "lucide-react";

import { formatBRL, formatNumber, formatPercent, formatRoas } from "@/lib/format";

import type { CampaignRow, CampaignTotals } from "@/uxpilot-ui/adapters/useCampaignsData";

export type UxCampaignRow = {
  id: string | number;
  name: string;
  client: string;
  clientSlug: string;
  objective: string;
  status: "active" | "paused" | "draft";
  spend: string;
  roas: string;
  cpl: string;
  ctr: string;
  impressions: string;
  clicks: string;
  conversions: string;
  frequency: string;
  cpm: string;
  budget: string;
  trend: "up" | "down";
  trendPct: string;
  rawStatus?: string;
  preset?: string;
  metaAdAccountId?: string;
};

export type UxCampaignKpi = {
  label: string;
  value: string;
  delta: string;
  icon: LucideIcon;
  color: string;
};

const objectiveLabels: Record<string, string> = {
  leads: "Leads",
  sales: "Conversões",
  traffic: "Tráfego",
  awareness: "Awareness",
  engagement: "Engajamento",
  default: "Geral"
};

function compact(n: number, locale: string) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(".", ",")}K`;
  return formatNumber(n, locale);
}

function mapStatus(status?: string): UxCampaignRow["status"] {
  if (status === "ACTIVE") return "active";
  if (status === "PAUSED") return "paused";
  return "paused";
}

function mapObjective(objective?: string | null, preset?: string): string {
  const key = (preset ?? objective ?? "default").toLowerCase();
  if (key.includes("lead")) return "Leads";
  if (key.includes("sale") || key === "sales") return "Conversões";
  if (key.includes("traffic")) return "Tráfego";
  if (key.includes("reach") || key.includes("awareness")) return "Awareness";
  return objectiveLabels[key] ?? objective ?? "Geral";
}

export function toUxCampaignRow(
  row: CampaignRow,
  locale: string,
  presets?: Record<string, string>
): UxCampaignRow {
  const cpl = row.cpl ?? row.cpa;
  return {
    id: row.metaCampaignId,
    name: row.campaignName,
    client: row.clientName,
    clientSlug: row.clientSlug,
    objective: mapObjective(row.objective, row.preset),
    status: mapStatus(row.status),
    preset: presets?.[row.metaCampaignId] ?? row.preset ?? "default",
    metaAdAccountId: row.metaAdAccountId,
    spend: formatBRL(row.spend, locale),
    roas: row.roas > 0 ? formatRoas(row.roas, locale) : "—",
    cpl: cpl != null && cpl > 0 ? formatBRL(cpl, locale) : "—",
    ctr: row.ctr != null ? formatPercent(row.ctr, 1, locale) : "—",
    impressions: row.impressions != null ? compact(row.impressions, locale) : "—",
    clicks: row.clicks != null ? formatNumber(row.clicks, locale) : "—",
    conversions: formatNumber(row.conversions + row.leads, locale),
    frequency: row.frequency != null ? row.frequency.toFixed(1).replace(".", ",") : "—",
    cpm: row.cpm != null ? formatBRL(row.cpm, locale) : "—",
    budget: row.dailyBudget != null ? `${formatBRL(row.dailyBudget, locale)}/dia` : "—",
    trend: row.roas >= 3 ? "up" : "down",
    trendPct: "",
    rawStatus: row.status
  };
}

export function toUxCampaignRows(
  rows: CampaignRow[],
  locale: string,
  presets?: Record<string, string>
): UxCampaignRow[] {
  return rows.map((r) => toUxCampaignRow(r, locale, presets));
}

export function toCampaignKpis(totals: CampaignTotals, rows: CampaignRow[], locale: string): UxCampaignKpi[] {
  const impressions = rows.reduce((s, r) => s + (r.impressions ?? 0), 0);
  const clicks = rows.reduce((s, r) => s + (r.clicks ?? 0), 0);
  const avgRoas =
    rows.length > 0 ? rows.reduce((s, r) => s + (r.roas ?? 0), 0) / rows.length : 0;
  const avgCpl =
    rows.filter((r) => (r.cpl ?? r.cpa) != null).length > 0
      ? rows.reduce((s, r) => s + (r.cpl ?? r.cpa ?? 0), 0) /
        rows.filter((r) => (r.cpl ?? r.cpa) != null).length
      : 0;

  return [
    {
      label: "Investimento Total",
      value: formatBRL(totals.spend, locale),
      delta: "—",
      icon: DollarSign,
      color: "#f5a623"
    },
    {
      label: "ROAS Médio",
      value: avgRoas > 0 ? formatRoas(avgRoas, locale) : "—",
      delta: "—",
      icon: TrendingUp,
      color: "#10b981"
    },
    {
      label: "Total de Impressões",
      value: impressions > 0 ? compact(impressions, locale) : "—",
      delta: "—",
      icon: Eye,
      color: "#4f46e5"
    },
    {
      label: "Total de Cliques",
      value: clicks > 0 ? compact(clicks, locale) : "—",
      delta: "—",
      icon: MousePointerClick,
      color: "#0ea5e9"
    },
    {
      label: "Conversões",
      value: formatNumber(totals.conversions + totals.leads, locale),
      delta: "—",
      icon: Zap,
      color: "#7c3aed"
    },
    {
      label: "CPL Médio",
      value: avgCpl > 0 ? formatBRL(avgCpl, locale) : "—",
      delta: "—",
      icon: BarChart2,
      color: "#ef4444"
    }
  ];
}
