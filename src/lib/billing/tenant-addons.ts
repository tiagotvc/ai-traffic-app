import "server-only";

import type { TenantAddon } from "@/db/entities/TenantAddon";
import { EMPTY_TENANT_ADDON_BONUSES, type TenantAddonBonuses } from "@/db/entities/TenantAddon";
import { repositories } from "@/db/repositories";
import type { PlanLimits } from "./types";

export type { TenantAddonBonuses };

export function addonBonusesFromRow(row: TenantAddon | null): TenantAddonBonuses {
  if (!row) return { ...EMPTY_TENANT_ADDON_BONUSES };
  return {
    extraClients: row.extraClients,
    extraAdAccounts: row.extraAdAccounts,
    extraMembers: row.extraMembers,
    extraAutomationRules: row.extraAutomationRules,
    extraAiRequestsPerMonth: row.extraAiRequestsPerMonth,
    extraScheduledReports: row.extraScheduledReports
  };
}

export function mergePlanLimitsWithAddons(base: PlanLimits, bonuses: TenantAddonBonuses): PlanLimits {
  return {
    maxClients: base.maxClients + bonuses.extraClients,
    maxAdAccounts: base.maxAdAccounts + bonuses.extraAdAccounts,
    maxMembers: base.maxMembers + bonuses.extraMembers,
    maxAutomationRules: base.maxAutomationRules + bonuses.extraAutomationRules,
    maxAiRequestsPerMonth: base.maxAiRequestsPerMonth + bonuses.extraAiRequestsPerMonth,
    maxScheduledReports: base.maxScheduledReports + bonuses.extraScheduledReports,
    allowAutoSync: base.allowAutoSync,
    allowLiveMeta: base.allowLiveMeta,
    allowCreativeMemoryAi: base.allowCreativeMemoryAi
  };
}

export async function getTenantAddonBonuses(tenantId: string): Promise<TenantAddonBonuses> {
  const { tenantAddon } = await repositories();
  const row = await tenantAddon.findOne({ where: { tenantId } });
  return addonBonusesFromRow(row);
}

export async function getTenantAddonRow(tenantId: string) {
  const { tenantAddon } = await repositories();
  return tenantAddon.findOne({ where: { tenantId } });
}

export function tenantAddonToJson(row: TenantAddon | null) {
  const bonuses = addonBonusesFromRow(row);
  return {
    ...bonuses,
    adminNote: row?.adminNote ?? null
  };
}

export async function upsertTenantAddons(
  tenantId: string,
  data: Partial<TenantAddonBonuses> & { adminNote?: string | null }
) {
  const { tenantAddon } = await repositories();
  let row = await tenantAddon.findOne({ where: { tenantId } });
  if (!row) {
    row = tenantAddon.create({ tenantId, ...EMPTY_TENANT_ADDON_BONUSES });
  }

  if (data.extraClients !== undefined) row.extraClients = Math.max(0, data.extraClients);
  if (data.extraAdAccounts !== undefined) row.extraAdAccounts = Math.max(0, data.extraAdAccounts);
  if (data.extraMembers !== undefined) row.extraMembers = Math.max(0, data.extraMembers);
  if (data.extraAutomationRules !== undefined) {
    row.extraAutomationRules = Math.max(0, data.extraAutomationRules);
  }
  if (data.extraAiRequestsPerMonth !== undefined) {
    row.extraAiRequestsPerMonth = Math.max(0, data.extraAiRequestsPerMonth);
  }
  if (data.extraScheduledReports !== undefined) {
    row.extraScheduledReports = Math.max(0, data.extraScheduledReports);
  }
  if (data.adminNote !== undefined) row.adminNote = data.adminNote?.trim() || null;

  return tenantAddon.save(row);
}
