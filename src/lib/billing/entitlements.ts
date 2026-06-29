import "server-only";

import { repositories } from "@/db/repositories";
import type { Plan } from "@/db/entities/Plan";
import type { Subscription } from "@/db/entities/Subscription";
import { isDemoClient, isSystemDefaultClient } from "@/lib/demo-data";
import { getAppShellContext } from "@/lib/app-shell-context";
import { redisDeleteKey } from "@/lib/redis-cache";
import { ensureFreeSubscription } from "./event-handlers";
import { getTenantAddonBonuses, mergePlanLimitsWithAddons } from "./tenant-addons";
import { resolveLimits } from "./resolve-limits";
import type { Entitlements, PlanLimitKey, PlanLimits, TenantUsage } from "./types";
import { PLATFORM_ADMIN_LIMITS } from "./types";
import { isAiCreditsV2Enabled } from "@/lib/ai-credits/feature-flags";
import { getPlatformFeatureFlags } from "@/lib/feature-flags/service";
import { isFeatureEnabledForUser } from "@/lib/feature-flags/registry";
import type { FeatureFlagConfigMap, FeatureFlagContext } from "@/lib/feature-flags/types";
import { sumTenantCreditsUsed } from "@/lib/ai-credits/usage-service";

export class PlanLimitError extends Error {
  code = "PLAN_LIMIT" as const;
  limitKey: PlanLimitKey;
  constructor(limitKey: PlanLimitKey, message: string) {
    super(message);
    this.name = "PlanLimitError";
    this.limitKey = limitKey;
  }
}

export class SubscriptionBlockedError extends Error {
  code = "SUBSCRIPTION_BLOCKED" as const;
  status: string;
  constructor(status: string) {
    super(`Subscription ${status}`);
    this.name = "SubscriptionBlockedError";
    this.status = status;
  }
}

export class SubscriptionSuspendedError extends Error {
  code = "ACCOUNT_SUSPENDED" as const;
  constructor() {
    super("Account suspended");
    this.name = "SubscriptionSuspendedError";
  }
}

export async function assertTenantCanLogin(tenantId: string) {
  const { subscription: sub } = await getTenantSubscription(tenantId);
  if (sub.status === "suspended") {
    throw new SubscriptionSuspendedError();
  }
}

function addDays(d: Date, days: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

/** Preenche período do trial Free quando a assinatura legada não tem datas. */
async function backfillFreeTrialPeriod(
  sub: Subscription,
  plan: Plan | null,
  subRepo: Awaited<ReturnType<typeof repositories>>["subscription"]
) {
  if (plan?.slug !== "free" || sub.currentPeriodEnd) return sub;
  const start = sub.currentPeriodStart ?? sub.createdAt ?? new Date();
  if (!sub.currentPeriodStart) sub.currentPeriodStart = start;
  sub.currentPeriodEnd = addDays(start, plan.trialDays || 7);
  return subRepo.save(sub);
}

export async function getTenantSubscription(tenantId: string) {
  const { subscription, plan } = await repositories();
  let sub = await subscription.findOne({ where: { tenantId } });
  if (!sub) sub = await ensureFreeSubscription(tenantId);
  const p = await plan.findOne({ where: { id: sub.planId } });
  if (p) sub = await backfillFreeTrialPeriod(sub, p, subscription);
  return { subscription: sub, plan: p };
}

export async function getTenantUsage(tenantId: string): Promise<TenantUsage> {
  const {
    client,
    adAccount,
    tenantMember,
    automationRule,
    aiRecommendation,
    reportSchedule
  } = await repositories();

  const clients = await client.find({ where: { tenantId } });
  const realClients = clients.filter((c) => !isDemoClient(c) && !isSystemDefaultClient(c));
  const clientIds = realClients.length > 0 ? realClients.map((c) => c.id) : clients.map((c) => c.id);

  let adAccounts = 0;
  if (clientIds.length) {
    adAccounts = await adAccount
      .createQueryBuilder("a")
      .where("a.clientId IN (:...ids)", { ids: clientIds })
      .getCount();
  }

  const members = await tenantMember.count({ where: { tenantId } });
  const automationRules = await automationRule.count({ where: { tenantId } });
  const scheduledReports = await reportSchedule.count({ where: { tenantId } });

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const v2 = await isAiCreditsV2Enabled();
  let aiRequestsThisMonth: number;
  if (v2) {
    aiRequestsThisMonth = await sumTenantCreditsUsed(tenantId);
  } else {
    aiRequestsThisMonth = await aiRecommendation
      .createQueryBuilder("r")
      .where("r.tenantId = :tenantId", { tenantId })
      .andWhere("r.createdAt >= :monthStart", { monthStart })
      .getCount();
  }

  return {
    clients: realClients.length || clients.length,
    adAccounts,
    members: Math.max(members, 1),
    automationRules,
    aiRequestsThisMonth,
    scheduledReports
  };
}

export { resolveLimits };

export function applyPlatformAdminEntitlements(entitlements: Entitlements): Entitlements {
  return {
    ...entitlements,
    canWrite: true,
    limits: { ...PLATFORM_ADMIN_LIMITS }
  };
}

/** Limite de plano → id de feature flag de plataforma (kill-switch acima do plano). */
const PLATFORM_MASKED_LIMITS: Partial<Record<PlanLimitKey, string>> = {
  allowCreativeMemoryAi: "brain",
  allowAgencyBrainHypotheses: "brain.hypotheses",
  allowAgencyBrainDna: "brain.dna",
  allowAgencyBrainTimeline: "brain.timeline",
  allowAgencyBrainExperiments: "brain.labs",
  allowAgencyBrainActionPlans: "brain.action-plans",
  allowAgencyBrainChat: "brain.chat",
  allowNavAutomations: "brain.automations",
  allowDashboardCanvas: "visions.canvas",
  allowDashboardResize: "visions.resize",
  allowDashboardAiBuilder: "visions.ai-builder",
  allowDashboardSharing: "visions.sharing"
};

/**
 * Aplica os feature flags de plataforma sobre os limites do plano: se a feature está
 * desligada para o usuário, o limite vira `false` (kill-switch). É o "E" entre plano e plataforma.
 */
function maskLimitsWithPlatformFlags(
  limits: PlanLimits,
  flags: FeatureFlagConfigMap,
  ctx: FeatureFlagContext
): PlanLimits {
  let masked: PlanLimits | null = null;
  for (const [key, featureId] of Object.entries(PLATFORM_MASKED_LIMITS)) {
    if (!isFeatureEnabledForUser(flags, featureId as string, ctx)) {
      masked = masked ?? { ...limits };
      (masked as Record<string, unknown>)[key] = false;
    }
  }
  return masked ?? limits;
}

export async function getEntitlements(
  tenantId: string,
  options?: { platformAdmin?: boolean; userId?: string }
): Promise<Entitlements> {
  const { subscription: sub, plan: p } = await getTenantSubscription(tenantId);
  const baseLimits = resolveLimits(p);
  const bonuses = await getTenantAddonBonuses(tenantId);
  const mergedLimits = mergePlanLimitsWithAddons(baseLimits, bonuses);
  const platformFlags = await getPlatformFeatureFlags();
  const flagCtx: FeatureFlagContext = {
    userId: options?.userId ?? "",
    isPlatformAdmin: !!options?.platformAdmin
  };
  const limits = maskLimitsWithPlatformFlags(mergedLimits, platformFlags, flagCtx);
  const usage = await getTenantUsage(tenantId);
  const isPaid = p?.slug !== "free" && sub.status === "active";
  const canWrite = sub.status === "active" || sub.status === "trialing" || p?.slug === "free";

  const entitlements: Entitlements = {
    planSlug: p?.slug ?? "free",
    planName: p?.name ?? "Free",
    status: sub.status,
    limits,
    usage,
    isPaid,
    canWrite: canWrite && sub.status !== "suspended"
  };

  if (options?.platformAdmin) {
    return applyPlatformAdminEntitlements(entitlements);
  }

  return entitlements;
}

const BOOLEAN_LIMIT_KEYS = [
  "allowAutoSync",
  "allowLiveMeta",
  "allowCreativeMemoryAi",
  "allowAgencyBrainHypotheses",
  "allowAgencyBrainDna",
  "allowAgencyBrainTimeline",
  "allowAgencyBrainExperiments",
  "allowAgencyBrainActionPlans",
  "allowAgencyBrainChat",
  "allowNavCampaigns",
  "allowNavAudiences",
  "allowNavCreatives",
  "allowNavReports",
  "allowNavAlerts",
  "allowNavAutomations",
  "allowDashboardCanvas",
  "allowDashboardResize",
  "allowDashboardAiBuilder",
  "allowDashboardSharing",
  "allowWhiteLabel"
] as const;

const TIER_LIMIT_KEYS = ["allowDashboardAiWidgets"] as const;

type NumericPlanLimitKey = Exclude<
  PlanLimitKey,
  (typeof BOOLEAN_LIMIT_KEYS)[number] | (typeof TIER_LIMIT_KEYS)[number]
>;

const LIMIT_CHECKS: Record<NumericPlanLimitKey, (u: TenantUsage) => number> = {
  maxClients: (u) => u.clients,
  maxAdAccounts: (u) => u.adAccounts,
  maxMembers: (u) => u.members,
  maxAutomationRules: (u) => u.automationRules,
  maxAiRequestsPerMonth: (u) => u.aiRequestsThisMonth,
  maxScheduledReports: (u) => u.scheduledReports,
  maxDashboards: () => 0,
  maxDashboardWidgets: () => 0
};

export async function assertSubscriptionWritable(tenantId: string) {
  const { subscription: sub } = await getTenantSubscription(tenantId);
  if (sub.status === "suspended") {
    throw new SubscriptionBlockedError("suspended");
  }
  if (sub.status === "past_due") {
    throw new SubscriptionBlockedError("past_due");
  }
}

export async function assertLimit(tenantId: string, key: PlanLimitKey) {
  const { platformAdmin, user } = await getAppShellContext();
  const ent = await getEntitlements(tenantId, { platformAdmin, userId: user.id });
  if ((BOOLEAN_LIMIT_KEYS as readonly string[]).includes(key)) {
    if (!ent.limits[key as (typeof BOOLEAN_LIMIT_KEYS)[number]]) {
      throw new PlanLimitError(key, `Recurso não incluído no plano ${ent.planName}`);
    }
    return ent;
  }
  if ((TIER_LIMIT_KEYS as readonly string[]).includes(key)) {
    if (!ent.limits.allowDashboardAiWidgets) {
      throw new PlanLimitError(key, `Recurso não incluído no plano ${ent.planName}`);
    }
    return ent;
  }
  const numericKey = key as NumericPlanLimitKey;
  const max = ent.limits[numericKey];
  if (typeof max !== "number" || max < 0) return ent;
  const current = LIMIT_CHECKS[numericKey](ent.usage);
  if (current >= max) {
    throw new PlanLimitError(key, `Limit reached: ${key} (${current}/${max})`);
  }
  return ent;
}

export async function assertFeature(tenantId: string, key: "allowAutoSync" | "allowLiveMeta") {
  return assertLimit(tenantId, key);
}

export function subscriptionToJson(sub: Subscription, plan: Plan | null) {
  return {
    status: sub.status,
    billingCycle: sub.billingCycle,
    paymentProvider: sub.paymentProvider,
    currentPeriodStart: sub.currentPeriodStart,
    currentPeriodEnd: sub.currentPeriodEnd,
    gracePeriodEndsAt: sub.gracePeriodEndsAt,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    plan: plan
      ? {
          id: plan.id,
          slug: plan.slug,
          name: plan.name,
          priceMonthlyCents: plan.priceMonthlyCents,
          priceYearlyCents: plan.priceYearlyCents,
          trialDays: plan.trialDays,
          limits: plan.limits
        }
      : null
  };
}

export async function invalidateEntitlementsForTenant(tenantId: string): Promise<void> {
  await redisDeleteKey(`entitlements:${tenantId}`);
}

export async function invalidateEntitlementsForPlan(planId: string): Promise<void> {
  const { subscription: subRepo } = await repositories();
  const subs = await subRepo.find({
    where: { planId },
    select: { tenantId: true }
  });
  await Promise.all(subs.map((s) => invalidateEntitlementsForTenant(s.tenantId)));
}
