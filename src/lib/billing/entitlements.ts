import "server-only";

import { repositories } from "@/db/repositories";
import type { Plan } from "@/db/entities/Plan";
import type { Subscription } from "@/db/entities/Subscription";
import { isDemoClient, isSystemDefaultClient } from "@/lib/demo-data";
import { ensureFreeSubscription } from "./event-handlers";
import { getTenantAddonBonuses, mergePlanLimitsWithAddons } from "./tenant-addons";
import type { Entitlements, PlanLimitKey, PlanLimits, TenantUsage } from "./types";
import { FREE_LIMITS } from "./types";

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
  const aiRequestsThisMonth = await aiRecommendation
    .createQueryBuilder("r")
    .where("r.tenantId = :tenantId", { tenantId })
    .andWhere("r.createdAt >= :monthStart", { monthStart })
    .getCount();

  return {
    clients: realClients.length || clients.length,
    adAccounts,
    members: Math.max(members, 1),
    automationRules,
    aiRequestsThisMonth,
    scheduledReports
  };
}

export function resolveLimits(plan: Plan | null): PlanLimits {
  if (!plan?.limits) return FREE_LIMITS;
  const raw = plan.limits as Partial<PlanLimits>;
  return {
    ...FREE_LIMITS,
    ...raw,
    allowCreativeMemoryAi: raw.allowCreativeMemoryAi ?? true
  };
}

export async function getEntitlements(tenantId: string): Promise<Entitlements> {
  const { subscription: sub, plan: p } = await getTenantSubscription(tenantId);
  const baseLimits = resolveLimits(p);
  const bonuses = await getTenantAddonBonuses(tenantId);
  const limits = mergePlanLimitsWithAddons(baseLimits, bonuses);
  const usage = await getTenantUsage(tenantId);
  const isPaid = p?.slug !== "free" && sub.status === "active";
  const canWrite = sub.status === "active" || sub.status === "trialing" || p?.slug === "free";

  return {
    planSlug: p?.slug ?? "free",
    planName: p?.name ?? "Free",
    status: sub.status,
    limits,
    usage,
    isPaid,
    canWrite: canWrite && sub.status !== "suspended"
  };
}

const LIMIT_CHECKS: Record<
  Exclude<PlanLimitKey, "allowAutoSync" | "allowLiveMeta" | "allowCreativeMemoryAi">,
  (u: TenantUsage) => number
> = {
  maxClients: (u) => u.clients,
  maxAdAccounts: (u) => u.adAccounts,
  maxMembers: (u) => u.members,
  maxAutomationRules: (u) => u.automationRules,
  maxAiRequestsPerMonth: (u) => u.aiRequestsThisMonth,
  maxScheduledReports: (u) => u.scheduledReports
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
  const ent = await getEntitlements(tenantId);
  if (key === "allowAutoSync" || key === "allowLiveMeta" || key === "allowCreativeMemoryAi") {
    if (!ent.limits[key]) throw new PlanLimitError(key, `Feature not included in ${ent.planName}`);
    return ent;
  }
  const max = ent.limits[key];
  const current = LIMIT_CHECKS[key](ent.usage);
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
