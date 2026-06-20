import { formatMetricValue, type MetricKey } from "@/lib/dashboard-metrics";
import { presetMetricsFor } from "@/lib/campaign-presets";
import { formatRoas } from "@/lib/format";

import type { ClientRow } from "@/uxpilot-ui/adapters/useClientsData";

const CARD_COLORS = ["#4f46e5", "#f5a623", "#10b981", "#7c3aed", "#0ea5e9", "#f43f5e"];

export type UxClientCard = {
  id: string;
  slug: string;
  name: string;
  logo: string;
  color: string;
  subtitle: string;
  accounts: number;
  budgetLabel: string;
  budgetValue: string;
  roasValue: string;
  cplValue: string;
  status: "healthy" | "warning";
  alertCount: number;
};

function metricValue(c: ClientRow, key: MetricKey, locale: string) {
  const v = c.metrics?.[key];
  if (v == null || Number.isNaN(v)) return "—";
  return formatMetricValue(key, v, locale);
}

export function toUxClientCards(clients: ClientRow[], locale: string): UxClientCard[] {
  return clients.map((c, i) => {
    const presetKeys = presetMetricsFor(c.dominantPreset).slice(0, 3);
    const spendKey = presetKeys.find((k) => k === "spend") ?? "spend";
    const roasKey = presetKeys.find((k) => k === "roas") ?? "roas";
    const costKey =
      presetKeys.find((k) => k === "cpa" || k === "cpmsg" || k === "cpc") ?? "cpa";

    const roasNum = c.metrics?.roas ?? c.roas;
    const roasValue = roasNum > 0 ? formatRoas(roasNum, locale) : "—";

    return {
      id: c.id,
      slug: c.slug,
      name: c.name,
      logo: c.name.trim().charAt(0).toUpperCase() || "?",
      color: CARD_COLORS[i % CARD_COLORS.length],
      subtitle: `${c.accounts} ${c.accounts === 1 ? "conta" : "contas"}`,
      accounts: c.accounts,
      budgetLabel: "Investimento",
      budgetValue: metricValue(c, spendKey, locale),
      roasValue,
      cplValue: metricValue(c, costKey, locale),
      status: c.alertCount > 0 ? "warning" : "healthy",
      alertCount: c.alertCount
    };
  });
}
