/** Helpers visuais das tabelas premium de campanhas. */

const PRESET_CODES: Record<string, string> = {
  default: "GE",
  lead_whatsapp: "WA",
  lead_site: "LS",
  sales: "VD",
  reach: "AL"
};

export function campaignPresetCode(preset?: string, customName?: string): string {
  if (!preset || preset === "default") return PRESET_CODES.default;
  if (preset.startsWith("custom:")) {
    const name = customName?.trim();
    if (name && name.length >= 2) return name.slice(0, 2).toUpperCase();
    return "CT";
  }
  return PRESET_CODES[preset] ?? preset.slice(0, 2).toUpperCase();
}

/** Verde / âmbar / neutro para CTR e métricas similares. */
export function campaignMetricTone(value: string): "good" | "warn" | "neutral" {
  const n = parseFloat(value.replace(/[^\d,.-]/g, "").replace(",", "."));
  if (Number.isNaN(n)) return "neutral";
  if (n >= 1.25) return "good";
  if (n >= 0.75) return "warn";
  return "neutral";
}

export function campaignMetricToneClass(tone: "good" | "warn" | "neutral"): string {
  if (tone === "good") return "ui-campaign-metric--good";
  if (tone === "warn") return "ui-campaign-metric--warn";
  return "ui-campaign-metric--neutral";
}

export const CAMPAIGN_ROW_SELECTED_BG = "var(--ui-accent-muted)";
