import type { MetricKey } from "@/lib/dashboard-metrics";
import { METRIC_BY_KEY } from "@/lib/dashboard-metrics";

export type CampaignPresetKey = "default" | "lead_whatsapp" | "lead_site" | "sales" | "reach";

export const CAMPAIGN_PRESETS: CampaignPresetKey[] = [
  "default",
  "lead_whatsapp",
  "lead_site",
  "sales",
  "reach"
];

/** Métricas mais importantes por tipo de campanha. */
export const PRESET_METRICS: Record<CampaignPresetKey, MetricKey[]> = {
  default: ["spend", "ctr", "reach", "conversions"],
  lead_whatsapp: ["messages", "cpmsg", "ctr", "spend"],
  lead_site: ["conversions", "cpa", "ctr", "spend"],
  sales: ["roas", "conversions", "cpa", "spend"],
  reach: ["reach", "impressions", "cpm", "frequency"]
};

export function presetMetricsFor(
  preset?: string | null,
  customTypes?: Map<string, { metrics: string[] }>
): MetricKey[] {
  if (preset?.startsWith("custom:")) {
    const id = preset.slice("custom:".length);
    const def = customTypes?.get(id);
    if (def?.metrics?.length) {
      const valid = def.metrics.filter((k): k is MetricKey => typeof k === "string" && k in METRIC_BY_KEY);
      if (valid.length) return valid;
    }
  }
  return PRESET_METRICS[(preset as CampaignPresetKey) ?? "default"] ?? PRESET_METRICS.default;
}
