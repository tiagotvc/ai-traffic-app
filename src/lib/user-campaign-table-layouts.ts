import "server-only";

import { repositories } from "@/db/repositories";
import {
  DEFAULT_CAMPAIGN_TABLE_LAYOUT,
  DEFAULT_LAYOUT_ID,
  normalizeCampaignTableLayouts,
  type CampaignTableLayout
} from "@/lib/campaign-table-layout";

export async function getUserCampaignTableLayouts(
  tenantId: string,
  userId: string
): Promise<{ layouts: CampaignTableLayout[]; activeLayoutId: string }> {
  const { tenantMember: repo } = await repositories();
  const row = await repo.findOne({ where: { tenantId, userId } });
  const layouts = normalizeCampaignTableLayouts(row?.campaignTableLayouts);
  const activeLayoutId =
    row?.activeCampaignTableLayoutId &&
    layouts.some((l) => l.id === row.activeCampaignTableLayoutId)
      ? row.activeCampaignTableLayoutId
      : layouts[0]?.id ?? DEFAULT_LAYOUT_ID;
  return { layouts, activeLayoutId };
}

export async function saveUserCampaignTableLayouts(
  tenantId: string,
  userId: string,
  layouts: CampaignTableLayout[],
  activeLayoutId?: string
): Promise<{ layouts: CampaignTableLayout[]; activeLayoutId: string }> {
  const normalized = normalizeCampaignTableLayouts(layouts);
  const active =
    activeLayoutId && normalized.some((l) => l.id === activeLayoutId)
      ? activeLayoutId
      : normalized[0]?.id ?? DEFAULT_LAYOUT_ID;

  const { tenantMember: repo } = await repositories();
  let row = await repo.findOne({ where: { tenantId, userId } });
  if (!row) {
    row = repo.create({
      tenantId,
      userId,
      role: "member",
      campaignTableLayouts: normalized as unknown as Record<string, unknown>[],
      activeCampaignTableLayoutId: active
    });
  } else {
    row.campaignTableLayouts = normalized as unknown as Record<string, unknown>[];
    row.activeCampaignTableLayoutId = active;
  }
  await repo.save(row);
  return { layouts: normalized, activeLayoutId: active };
}

export function getActiveLayout(
  layouts: CampaignTableLayout[],
  activeLayoutId: string
): CampaignTableLayout {
  return layouts.find((l) => l.id === activeLayoutId) ?? layouts[0] ?? DEFAULT_CAMPAIGN_TABLE_LAYOUT;
}
