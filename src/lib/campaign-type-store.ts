import "server-only";

import { repositories } from "@/db/repositories";
import type { CampaignTypeDefinition } from "@/db/entities/CampaignTypeDefinition";
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

export async function listCampaignTypesForUser(
  tenantId: string,
  userId: string
): Promise<CampaignTypeDefinition[]> {
  const { campaignTypeDefinition: repo } = await repositories();
  const rows = await repo.find({
    where: { tenantId },
    order: { createdAt: "ASC" }
  });
  return rows.filter((r) => r.shared || r.createdByUserId === userId);
}

export function metricsForCampaignType(
  presetKey: string,
  customTypes: Map<string, CampaignTypeDefinition>
): MetricKey[] {
  if (isBuiltinPresetKey(presetKey)) return PRESET_METRICS[presetKey];
  const id = customTypeIdFromKey(presetKey);
  if (id) {
    const def = customTypes.get(id);
    if (def) return normalizeTypeMetrics(def.metrics);
  }
  return PRESET_METRICS.default;
}

export async function validatePresetKey(
  tenantId: string,
  userId: string,
  preset: string
): Promise<boolean> {
  if (isBuiltinPresetKey(preset)) return true;
  const id = customTypeIdFromKey(preset);
  if (!id) return false;
  const { campaignTypeDefinition: repo } = await repositories();
  const row = await repo.findOne({ where: { id, tenantId } });
  if (!row) return false;
  return row.shared || row.createdByUserId === userId;
}
