import "server-only";

import { repositories } from "@/db/repositories";
import type { TenantAiPolicy } from "@/db/entities/TenantAiPolicy";

import type { AiDistributionMode, TenantAiPolicyDto } from "./types";

export const DEFAULT_TENANT_AI_POLICY: TenantAiPolicyDto = {
  distributionMode: "shared_pool",
  alertThresholdPercent: 80,
  reservePercent: 0,
  defaultClientMonthlyCap: null,
  customWeights: null
};

function toDto(row: TenantAiPolicy): TenantAiPolicyDto {
  return {
    distributionMode: row.distributionMode as AiDistributionMode,
    alertThresholdPercent: row.alertThresholdPercent,
    reservePercent: row.reservePercent,
    defaultClientMonthlyCap: row.defaultClientMonthlyCap ?? null,
    customWeights: row.customWeights ?? null
  };
}

export async function getTenantAiPolicy(tenantId: string): Promise<TenantAiPolicyDto> {
  const { tenantAiPolicy: repo } = await repositories();
  const row = await repo.findOne({ where: { tenantId } });
  if (!row) return { ...DEFAULT_TENANT_AI_POLICY };
  return toDto(row);
}

export async function upsertTenantAiPolicy(
  tenantId: string,
  patch: Partial<TenantAiPolicyDto>
): Promise<TenantAiPolicyDto> {
  const { tenantAiPolicy: repo } = await repositories();
  let row = await repo.findOne({ where: { tenantId } });
  if (!row) {
    row = repo.create({ tenantId, ...DEFAULT_TENANT_AI_POLICY });
  }

  if (patch.distributionMode !== undefined) row.distributionMode = patch.distributionMode;
  if (patch.alertThresholdPercent !== undefined) {
    row.alertThresholdPercent = Math.min(100, Math.max(0, patch.alertThresholdPercent));
  }
  if (patch.reservePercent !== undefined) {
    row.reservePercent = Math.min(100, Math.max(0, patch.reservePercent));
  }
  if (patch.defaultClientMonthlyCap !== undefined) {
    row.defaultClientMonthlyCap =
      patch.defaultClientMonthlyCap === null ? null : Math.max(0, patch.defaultClientMonthlyCap);
  }
  if (patch.customWeights !== undefined) {
    row.customWeights = patch.customWeights;
  }

  const saved = await repo.save(row);
  return toDto(saved);
}

export async function getClientAiSettings(clientId: string) {
  const { clientMetaSettings: repo } = await repositories();
  const row = await repo.findOne({ where: { clientId } });
  return {
    aiEnabled: row?.aiEnabled !== false,
    aiMonthlyCap: row?.aiMonthlyCap ?? null
  };
}

export async function patchClientAiSettings(
  clientId: string,
  patch: { aiEnabled?: boolean; aiMonthlyCap?: number | null }
) {
  const { clientMetaSettings: repo } = await repositories();
  let row = await repo.findOne({ where: { clientId } });
  if (!row) {
    row = repo.create({
      clientId,
      targeting: { countries: ["BR"], age_min: 18, age_max: 65 },
      specialAdCategories: [],
      defaultCustomAudienceIds: [],
      defaultExcludedAudienceIds: [],
      aiEnabled: true
    });
  }
  if (patch.aiEnabled !== undefined) row.aiEnabled = patch.aiEnabled;
  if (patch.aiMonthlyCap !== undefined) {
    row.aiMonthlyCap = patch.aiMonthlyCap === null ? null : Math.max(0, patch.aiMonthlyCap);
  }
  await repo.save(row);
  return {
    aiEnabled: row.aiEnabled !== false,
    aiMonthlyCap: row.aiMonthlyCap ?? null
  };
}
