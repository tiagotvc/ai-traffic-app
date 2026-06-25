import "server-only";

import { repositories } from "@/db/repositories";
import { isDemoClient, isSystemDefaultClient } from "@/lib/demo-data";
import { getEntitlements } from "@/lib/billing/entitlements";

import { CM_AI_ACTION_TYPES } from "./defaults";
import { getTenantAiPolicy } from "./policy-service";
import type { AiCreditsUsageDto } from "./types";

function monthStart(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function sumTenantCreditsUsed(tenantId: string): Promise<number> {
  const { aiRecommendation: repo } = await repositories();
  const raw = await repo
    .createQueryBuilder("r")
    .select('COALESCE(SUM(r."creditsCharged"), 0)', "total")
    .where("r.tenantId = :tenantId", { tenantId })
    .andWhere("r.createdAt >= :monthStart", { monthStart: monthStart() })
    .getRawOne<{ total: string }>();
  return Number(raw?.total ?? 0);
}

export async function sumClientCreditsUsed(
  tenantId: string,
  clientId: string
): Promise<number> {
  const { aiRecommendation: repo } = await repositories();
  const raw = await repo
    .createQueryBuilder("r")
    .select('COALESCE(SUM(r."creditsCharged"), 0)', "total")
    .where("r.tenantId = :tenantId", { tenantId })
    .andWhere("r.clientId = :clientId", { clientId })
    .andWhere("r.createdAt >= :monthStart", { monthStart: monthStart() })
    .getRawOne<{ total: string }>();
  return Number(raw?.total ?? 0);
}

/** Legacy: count rows (1 row = 1 unit) for CM/AB AI types only. */
export async function countLegacyAiRequests(tenantId: string): Promise<number> {
  const { aiRecommendation: recRepo } = await repositories();
  return recRepo
    .createQueryBuilder("r")
    .where("r.tenantId = :tenantId", { tenantId })
    .andWhere("r.createdAt >= :monthStart", { monthStart: monthStart() })
    .andWhere("r.actionType IN (:...types)", { types: [...CM_AI_ACTION_TYPES] })
    .getCount();
}

export async function countAllAiRowsThisMonth(tenantId: string): Promise<number> {
  const { aiRecommendation: recRepo } = await repositories();
  return recRepo
    .createQueryBuilder("r")
    .where("r.tenantId = :tenantId", { tenantId })
    .andWhere("r.createdAt >= :monthStart", { monthStart: monthStart() })
    .getCount();
}

export async function getCreditsUsageByClient(tenantId: string) {
  const { aiRecommendation: repo, client: clientRepo } = await repositories();
  const rows = await repo
    .createQueryBuilder("r")
    .select("r.clientId", "clientId")
    .addSelect('COALESCE(SUM(r."creditsCharged"), 0)', "creditsUsed")
    .where("r.tenantId = :tenantId", { tenantId })
    .andWhere("r.createdAt >= :monthStart", { monthStart: monthStart() })
    .andWhere("r.clientId IS NOT NULL")
    .groupBy("r.clientId")
    .getRawMany<{ clientId: string; creditsUsed: string }>();

  const clients = await clientRepo.find({ where: { tenantId } });
  const nameById = new Map(clients.map((c) => [c.id, c.name]));

  return rows.map((r) => ({
    clientId: r.clientId,
    clientName: nameById.get(r.clientId) ?? r.clientId.slice(0, 8),
    creditsUsed: Number(r.creditsUsed ?? 0)
  }));
}

export async function buildAiCreditsUsage(tenantId: string): Promise<AiCreditsUsageDto> {
  const ent = await getEntitlements(tenantId);
  const policy = await getTenantAiPolicy(tenantId);
  const creditsLimit = ent.limits.maxAiRequestsPerMonth;
  const creditsUsed = await sumTenantCreditsUsed(tenantId);
  const creditsRemaining =
    creditsLimit < 0 ? Number.POSITIVE_INFINITY : Math.max(0, creditsLimit - creditsUsed);
  const threshold = policy.alertThresholdPercent / 100;
  const nearLimit =
    creditsLimit > 0 && creditsUsed / creditsLimit >= threshold && creditsUsed < creditsLimit;
  const atLimit = creditsLimit >= 0 && creditsUsed >= creditsLimit;

  const byClientRaw = await getCreditsUsageByClient(tenantId);
  const { clientMetaSettings: settingsRepo } = await repositories();
  const { client: clientRepo } = await repositories();
  const allClients = await clientRepo.find({ where: { tenantId } });
  const realClients = allClients.filter((c) => !isDemoClient(c) && !isSystemDefaultClient(c));

  const byClient = await Promise.all(
    (realClients.length ? realClients : allClients).map(async (c) => {
      const settings = await settingsRepo.findOne({ where: { clientId: c.id } });
      const cap =
        settings?.aiMonthlyCap ??
        (policy.distributionMode === "per_client_cap" ? policy.defaultClientMonthlyCap : null);
      const used =
        byClientRaw.find((x) => x.clientId === c.id)?.creditsUsed ??
        (await sumClientCreditsUsed(tenantId, c.id));
      return {
        clientId: c.id,
        clientName: c.name,
        creditsUsed: used,
        monthlyCap: cap ?? null
      };
    })
  );

  return {
    creditsUsed,
    creditsLimit,
    creditsRemaining: creditsLimit < 0 ? -1 : creditsRemaining,
    alertThresholdPercent: policy.alertThresholdPercent,
    nearLimit,
    atLimit,
    byClient
  };
}
