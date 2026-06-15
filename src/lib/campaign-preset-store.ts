import "server-only";

import { repositories } from "@/db/repositories";

export type WithCampaignPreset<T> = T & { preset: string };

export async function getCampaignPresetsMap(tenantId: string): Promise<Record<string, string>> {
  const { campaignPreset: repo } = await repositories();
  const rows = await repo.find({ where: { tenantId } });
  const map: Record<string, string> = {};
  for (const r of rows) map[r.metaCampaignId] = r.preset;
  return map;
}

export function withCampaignPresets<T extends { metaCampaignId: string }>(
  rows: T[],
  presets: Record<string, string>
): WithCampaignPreset<T>[] {
  return rows.map((r) => ({
    ...r,
    preset: presets[r.metaCampaignId] ?? "default"
  }));
}
