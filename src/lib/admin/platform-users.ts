import "server-only";

import type { PlatformRole } from "@/db/entities/User";
import type { BillingCycle, SubscriptionStatus } from "@/lib/billing/types";
import { repositories } from "@/db/repositories";
import { listAdminPlans } from "@/lib/billing/admin-plans";
import {
  getTenantAddonRow,
  mergePlanLimitsWithAddons,
  tenantAddonToJson,
  upsertTenantAddons
} from "@/lib/billing/tenant-addons";
import {
  getEntitlements,
  getTenantSubscription,
  getTenantUsage,
  resolveLimits,
  subscriptionToJson
} from "@/lib/billing/entitlements";
import { ensureFreeSubscription } from "@/lib/billing/event-handlers";

export type PlatformUserListItem = {
  id: string;
  email: string;
  name: string | null;
  platformRole: PlatformRole;
  tenantId: string;
  tenantName: string;
  planSlug: string;
  planName: string;
  subscriptionStatus: SubscriptionStatus;
  createdAt: string;
};

function addYears(date: Date, years: number): Date {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

export async function listPlatformUsers(opts: { q?: string; page?: number; limit?: number }) {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 25));
  const offset = (page - 1) * limit;
  const q = opts.q?.trim().toLowerCase() ?? "";

  const { user: userRepo } = await repositories();

  const qb = userRepo
    .createQueryBuilder("u")
    .innerJoin("tenants", "t", 't.id = u."tenantId"')
    .leftJoin("subscriptions", "s", 's."tenantId" = u."tenantId"')
    .leftJoin("plans", "p", 'p.id = s."planId"')
    .select([
      'u.id AS "id"',
      'u.email AS "email"',
      'u.name AS "name"',
      'u."platformRole" AS "platformRole"',
      'u."tenantId" AS "tenantId"',
      'u."createdAt" AS "createdAt"',
      't.name AS "tenantName"',
      'COALESCE(p.slug, \'free\') AS "planSlug"',
      'COALESCE(p.name, \'Free\') AS "planName"',
      'COALESCE(s.status, \'active\') AS "subscriptionStatus"'
    ])
    .orderBy('u."createdAt"', "DESC")
    .offset(offset)
    .limit(limit);

  if (q) {
    qb.andWhere(
      `(LOWER(u.email) LIKE :q OR LOWER(COALESCE(u.name, '')) LIKE :q OR LOWER(t.name) LIKE :q)`,
      { q: `%${q}%` }
    );
  }

  const countQb = userRepo
    .createQueryBuilder("u")
    .innerJoin("tenants", "t", 't.id = u."tenantId"')
    .select("COUNT(*)", "count");

  if (q) {
    countQb.andWhere(
      `(LOWER(u.email) LIKE :q OR LOWER(COALESCE(u.name, '')) LIKE :q OR LOWER(t.name) LIKE :q)`,
      { q: `%${q}%` }
    );
  }

  const [rows, countRow] = await Promise.all([
    qb.getRawMany<PlatformUserListItem>(),
    countQb.getRawOne<{ count: string }>()
  ]);

  const total = Number(countRow?.count ?? 0);

  return {
    users: rows.map((r) => ({
      ...r,
      createdAt: new Date(r.createdAt).toISOString()
    })),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit))
  };
}

export async function getPlatformUserDetail(userId: string) {
  const { user: userRepo, tenant: tenantRepo, tenantMember: memberRepo } = await repositories();

  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) return null;

  const tenant = await tenantRepo.findOne({ where: { id: user.tenantId } });
  if (!tenant) return null;

  const [{ subscription, plan }, usage, addonRow, members, plans, entitlements] = await Promise.all([
    getTenantSubscription(user.tenantId),
    getTenantUsage(user.tenantId),
    getTenantAddonRow(user.tenantId),
    memberRepo.find({ where: { tenantId: user.tenantId } }),
    listAdminPlans(),
    getEntitlements(user.tenantId)
  ]);

  const memberUsers =
    members.length > 0
      ? await userRepo
          .createQueryBuilder("u")
          .where("u.id IN (:...ids)", { ids: members.map((m) => m.userId) })
          .getMany()
      : [];

  const baseLimits = resolveLimits(plan);
  const addons = tenantAddonToJson(addonRow);
  const effectiveLimits = mergePlanLimitsWithAddons(baseLimits, addons);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      platformRole: user.platformRole,
      facebookId: user.facebookId ?? null,
      googleId: user.googleId ?? null,
      tenantId: user.tenantId,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    },
    tenant: {
      id: tenant.id,
      name: tenant.name,
      brandName: tenant.brandName ?? null,
      logoUrl: tenant.logoUrl ?? null,
      metaConnectionUserId: tenant.metaConnectionUserId ?? null,
      createdAt: tenant.createdAt.toISOString()
    },
    subscription: subscriptionToJson(subscription, plan),
    addons,
    limits: {
      base: baseLimits,
      effective: effectiveLimits
    },
    usage,
    entitlements: {
      planSlug: entitlements.planSlug,
      planName: entitlements.planName,
      status: entitlements.status,
      isPaid: entitlements.isPaid,
      canWrite: entitlements.canWrite
    },
    members: memberUsers.map((m) => ({
      id: m.id,
      email: m.email,
      name: m.name ?? null,
      platformRole: m.platformRole,
      role: members.find((mb) => mb.userId === m.id)?.role ?? "member"
    })),
    plans: plans.map((p) => ({ id: p.id, slug: p.slug, name: p.name, isActive: p.isActive }))
  };
}

export async function updatePlatformUser(
  userId: string,
  data: { name?: string | null; email?: string; platformRole?: PlatformRole }
) {
  const { user: userRepo } = await repositories();
  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) return null;

  if (data.name !== undefined) user.name = data.name?.trim() || null;
  if (data.platformRole !== undefined) user.platformRole = data.platformRole;

  if (data.email !== undefined) {
    const email = data.email.trim().toLowerCase();
    if (!email) throw new Error("Email inválido");
    const existing = await userRepo.findOne({ where: { email } });
    if (existing && existing.id !== userId) throw new Error("Email já em uso");
    user.email = email;
  }

  await userRepo.save(user);
  return getPlatformUserDetail(userId);
}

export async function updateTenantProfile(
  tenantId: string,
  data: { name?: string; brandName?: string | null }
) {
  const { tenant: tenantRepo } = await repositories();
  const tenant = await tenantRepo.findOne({ where: { id: tenantId } });
  if (!tenant) return null;

  if (data.name !== undefined) {
    const name = data.name.trim();
    if (!name) throw new Error("Nome do workspace inválido");
    tenant.name = name;
  }
  if (data.brandName !== undefined) tenant.brandName = data.brandName?.trim() || null;

  await tenantRepo.save(tenant);
  return tenant;
}

export async function updateTenantSubscription(
  tenantId: string,
  data: {
    planSlug?: string;
    status?: SubscriptionStatus;
    billingCycle?: BillingCycle;
    currentPeriodEnd?: string | null;
    cancelAtPeriodEnd?: boolean;
  }
) {
  const { subscription: subRepo, plan: planRepo } = await repositories();

  let sub = await subRepo.findOne({ where: { tenantId } });
  if (!sub) sub = await ensureFreeSubscription(tenantId);

  if (data.planSlug) {
    const plan = await planRepo.findOne({ where: { slug: data.planSlug } });
    if (!plan) throw new Error(`Plano não encontrado: ${data.planSlug}`);
    sub.planId = plan.id;
  }

  if (data.status) sub.status = data.status;
  if (data.billingCycle) sub.billingCycle = data.billingCycle;
  if (data.cancelAtPeriodEnd !== undefined) sub.cancelAtPeriodEnd = data.cancelAtPeriodEnd;

  if (data.currentPeriodEnd !== undefined) {
    sub.currentPeriodEnd = data.currentPeriodEnd ? new Date(data.currentPeriodEnd) : null;
  }

  if (data.planSlug && data.status === "active" && !sub.currentPeriodStart) {
    const now = new Date();
    sub.currentPeriodStart = now;
    if (!sub.currentPeriodEnd) sub.currentPeriodEnd = addYears(now, 1);
    sub.canceledAt = null;
    sub.gracePeriodEndsAt = null;
  }

  await subRepo.save(sub);
  const plan = await planRepo.findOne({ where: { id: sub.planId } });
  return subscriptionToJson(sub, plan);
}

export async function updateTenantAddonsAdmin(
  tenantId: string,
  data: Parameters<typeof upsertTenantAddons>[1]
) {
  const row = await upsertTenantAddons(tenantId, data);
  return tenantAddonToJson(row);
}
