import {
  CAMPAIGN_PRESETS,
  PRESET_METRICS,
  type CampaignPresetKey
} from "@/lib/campaign-presets";
import { METRIC_BY_KEY, type MetricKey } from "@/lib/dashboard-metrics";

export const CUSTOM_TYPE_PREFIX = "custom:";

export function isCustomTypeKey(preset: string): boolean {
  return preset.startsWith(CUSTOM_TYPE_PREFIX);
}

export function customTypeIdFromKey(preset: string): string | null {
  if (!isCustomTypeKey(preset)) return null;
  return preset.slice(CUSTOM_TYPE_PREFIX.length) || null;
}

export function customTypeKey(id: string): string {
  return `${CUSTOM_TYPE_PREFIX}${id}`;
}

export const BUILTIN_PRESET_KEYS = [...CAMPAIGN_PRESETS] as const;

export function isBuiltinPresetKey(preset: string): preset is CampaignPresetKey {
  return (BUILTIN_PRESET_KEYS as readonly string[]).includes(preset);
}

export function normalizeTypeMetrics(raw: unknown): MetricKey[] {
  if (!Array.isArray(raw)) return [...PRESET_METRICS.default];
  const valid = raw.filter((k): k is MetricKey => typeof k === "string" && k in METRIC_BY_KEY);
  const unique = [...new Set(valid)];
  return unique.length ? unique.slice(0, 8) : [...PRESET_METRICS.default];
}

export function metricsForCampaignType(
  presetKey: string,
  customTypes: Map<string, { metrics: string[] }>
): MetricKey[] {
  if (isBuiltinPresetKey(presetKey)) return PRESET_METRICS[presetKey];
  const id = customTypeIdFromKey(presetKey);
  if (id) {
    const def = customTypes.get(id);
    if (def) return normalizeTypeMetrics(def.metrics);
  }
  return PRESET_METRICS.default;
}
