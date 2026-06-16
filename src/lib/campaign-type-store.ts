import "server-only";

import { repositories } from "@/db/repositories";
import type { CampaignTypeDefinition } from "@/db/entities/CampaignTypeDefinition";
import {
  customTypeIdFromKey,
  isBuiltinPresetKey,
  metricsForCampaignType,
  normalizeTypeMetrics
} from "@/lib/campaign-type-keys";

export {
  CUSTOM_TYPE_PREFIX,
  BUILTIN_PRESET_KEYS,
  customTypeKey,
  customTypeIdFromKey,
  isBuiltinPresetKey,
  isCustomTypeKey,
  metricsForCampaignType,
  normalizeTypeMetrics
} from "@/lib/campaign-type-keys";

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
