import "server-only";

import { repositories } from "@/db/repositories";
import type { AppsumoLicense, AppsumoLicenseStatus } from "@/db/entities/AppsumoLicense";
import { ensureFreeSubscription } from "@/lib/billing/event-handlers";
import { invalidateEntitlementsForTenant } from "@/lib/billing/entitlements";
import { planSlugForAppsumoTier } from "./plan-mapping";

export type AppsumoWebhookPayload = {
  license_key: string;
  prev_license_key?: string;
  event: "purchase" | "activate" | "upgrade" | "downgrade" | "migrate" | "deactivate" | string;
  event_timestamp: number;
  created_at: number;
  license_status: AppsumoLicenseStatus;
  tier?: number;
  test?: boolean;
  extra?: { reason?: string };
  partner_plan_name?: string;
  parent_license_key?: string;
  unit_quantity?: number;
};

async function findOrCreateByLicenseKey(licenseKey: string): Promise<AppsumoLicense> {
  const { appsumoLicense } = await repositories();
  const existing = await appsumoLicense.findOne({ where: { licenseKey } });
  if (existing) return existing;
  return appsumoLicense.create({ licenseKey, licenseStatus: "inactive" });
}

function applyPayloadFields(row: AppsumoLicense, payload: AppsumoWebhookPayload): void {
  row.licenseStatus = payload.license_status;
  if (payload.tier != null) row.tier = payload.tier;
  if (payload.partner_plan_name != null) row.partnerPlanName = payload.partner_plan_name;
  if (payload.parent_license_key != null) row.parentLicenseKey = payload.parent_license_key;
  if (payload.unit_quantity != null) row.unitQuantity = payload.unit_quantity;
  row.lastEvent = payload.event;
  row.lastEventAt = new Date(payload.event_timestamp);
  row.rawPayload = payload;
}

/** Points the tenant's Subscription at the plan for this AppSumo tier. Idempotent. */
async function syncSubscriptionForTenant(
  tenantId: string,
  licenseKey: string,
  tier: number | null | undefined
): Promise<void> {
  const { subscription: subRepo, plan: planRepo } = await repositories();
  const slug = planSlugForAppsumoTier(tier);
  const plan = await planRepo.findOne({ where: { slug } });
  if (!plan) {
    console.error(`[appsumo] plan slug "${slug}" not found, cannot activate tenant=${tenantId}`);
    return;
  }

  await ensureFreeSubscription(tenantId);
  const sub = await subRepo.findOne({ where: { tenantId } });
  if (!sub) return;

  sub.planId = plan.id;
  sub.status = "active";
  sub.paymentProvider = "appsumo";
  sub.externalSubscriptionId = licenseKey;
  await subRepo.save(sub);
  await invalidateEntitlementsForTenant(tenantId);
}

async function suspendSubscriptionForTenant(tenantId: string): Promise<void> {
  const { subscription: subRepo } = await repositories();
  const sub = await subRepo.findOne({ where: { tenantId } });
  if (!sub) return;
  sub.status = "suspended";
  await subRepo.save(sub);
  await invalidateEntitlementsForTenant(tenantId);
}

/**
 * Links a purchased license to a tenant once the buyer completes OAuth activation.
 * Called from the OAuth callback, not from the webhook — the webhook never knows a tenantId
 * on its own (AppSumo doesn't send buyer emails).
 */
export async function linkAppsumoLicenseToTenant(
  tenantId: string,
  licenseKey: string
): Promise<AppsumoLicense> {
  const { appsumoLicense } = await repositories();
  const row = await findOrCreateByLicenseKey(licenseKey);
  row.tenantId = tenantId;
  const saved = await appsumoLicense.save(row);
  await syncSubscriptionForTenant(tenantId, licenseKey, saved.tier);
  return saved;
}

async function handleUpgradeOrDowngrade(payload: AppsumoWebhookPayload): Promise<void> {
  const { appsumoLicense } = await repositories();
  const newRow = await findOrCreateByLicenseKey(payload.license_key);
  applyPayloadFields(newRow, payload);
  newRow.prevLicenseKey = payload.prev_license_key ?? null;

  const oldRow = payload.prev_license_key
    ? await appsumoLicense.findOne({ where: { licenseKey: payload.prev_license_key } })
    : null;

  if (oldRow?.tenantId) {
    // Carry the tenant link to the new key immediately, and detach the old row right away —
    // don't wait for the simultaneous `deactivate` webhook for prev_license_key, otherwise a
    // race could suspend the tenant that just upgraded (see class doc on AppsumoLicense).
    newRow.tenantId = oldRow.tenantId;
    oldRow.tenantId = null;
    oldRow.licenseStatus = "deactivated";
    await appsumoLicense.save(oldRow);
  }

  const saved = await appsumoLicense.save(newRow);
  if (saved.tenantId) {
    await syncSubscriptionForTenant(saved.tenantId, saved.licenseKey, saved.tier);
  }
}

async function handleDeactivate(payload: AppsumoWebhookPayload): Promise<void> {
  const { appsumoLicense } = await repositories();
  const row = await findOrCreateByLicenseKey(payload.license_key);
  const tenantId = row.tenantId;
  applyPayloadFields(row, payload);
  row.licenseStatus = "deactivated";
  await appsumoLicense.save(row);

  // tenantId is null here if this key was already superseded by an upgrade/downgrade — in
  // that case the tenant is on the new key's plan and must not be suspended.
  if (tenantId) {
    await suspendSubscriptionForTenant(tenantId);
  }
}

async function handlePurchaseActivateOrMigrate(payload: AppsumoWebhookPayload): Promise<void> {
  const { appsumoLicense } = await repositories();
  const row = await findOrCreateByLicenseKey(payload.license_key);
  applyPayloadFields(row, payload);
  const saved = await appsumoLicense.save(row);
  if (saved.tenantId) {
    await syncSubscriptionForTenant(saved.tenantId, saved.licenseKey, saved.tier);
  }
}

/**
 * Reconciliation entry point (Licensing API, not a webhook) — compares AppSumo's live license
 * record against our local row and corrects drift, e.g. a missed `deactivate` webhook. No-op
 * when already in sync. Used by the monthly reconcile cron.
 */
export async function reconcileAppsumoLicense(
  licenseKey: string,
  apiLicense: { status: AppsumoLicenseStatus; tier?: number | null }
): Promise<{ changed: boolean }> {
  const { appsumoLicense } = await repositories();
  const row = await findOrCreateByLicenseKey(licenseKey);
  if (row.licenseStatus === apiLicense.status) {
    return { changed: false };
  }

  row.licenseStatus = apiLicense.status;
  if (apiLicense.tier != null) row.tier = apiLicense.tier;
  row.lastEvent = "reconcile";
  row.lastEventAt = new Date();
  const saved = await appsumoLicense.save(row);

  if (saved.tenantId) {
    if (apiLicense.status === "deactivated") {
      await suspendSubscriptionForTenant(saved.tenantId);
    } else if (apiLicense.status === "active") {
      await syncSubscriptionForTenant(saved.tenantId, saved.licenseKey, saved.tier);
    }
  }

  return { changed: true };
}

/**
 * Entry point for POST /api/webhooks/appsumo. Always returns the required
 * `{ event, success: true }` shape — AppSumo retries on anything else.
 */
export async function handleAppsumoWebhookEvent(
  payload: AppsumoWebhookPayload
): Promise<{ event: string; success: true }> {
  // Validation pings from the Partner Portal — echo success, never touch real data.
  if (!payload.test) {
    switch (payload.event) {
      case "purchase":
      case "activate":
      case "migrate":
        await handlePurchaseActivateOrMigrate(payload);
        break;
      case "upgrade":
      case "downgrade":
        await handleUpgradeOrDowngrade(payload);
        break;
      case "deactivate":
        await handleDeactivate(payload);
        break;
      default:
        console.warn(`[appsumo] unrecognized webhook event type: ${payload.event}`);
    }
  }

  return { event: payload.event, success: true };
}
