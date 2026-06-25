import "server-only";

import { repositories } from "@/db/repositories";
import type { Subscription } from "@/db/entities/Subscription";
import { emitAsaasNotaFiscal, authorizeAsaasNotaFiscal } from "@/lib/asaas/nota-fiscal";
import { enqueueBillingJob } from "./jobs";
import { recordCouponRedemption } from "./coupons";

export const GRACE_DAYS = 3;

function addDays(d: Date, days: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

function addMonths(d: Date, months: number) {
  const r = new Date(d);
  r.setMonth(r.getMonth() + months);
  return r;
}

function addYears(d: Date, years: number) {
  const r = new Date(d);
  r.setFullYear(r.getFullYear() + years);
  return r;
}

export async function activateProSubscription(
  tenantId: string,
  planId: string,
  provider: "asaas" | "stripe",
  externalCustomerId: string,
  externalSubscriptionId: string | null,
  billingCycle: "monthly" | "yearly"
) {
  const { subscription: subRepo } = await repositories();
  let sub = await subRepo.findOne({ where: { tenantId } });
  const now = new Date();

  const isRenewal =
    sub &&
    sub.status === "active" &&
    sub.planId === planId &&
    sub.currentPeriodEnd &&
    sub.currentPeriodEnd > now;

  const periodBase =
    isRenewal && sub?.currentPeriodEnd ? sub.currentPeriodEnd : now;
  const periodEnd =
    billingCycle === "yearly" ? addYears(periodBase, 1) : addMonths(periodBase, 1);

  if (!sub) {
    sub = subRepo.create({
      tenantId,
      planId,
      status: "active",
      paymentProvider: provider,
      billingCycle,
      externalCustomerId,
      externalSubscriptionId,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      gracePeriodEndsAt: null,
      cancelAtPeriodEnd: false
    });
  } else {
    if (!isRenewal) sub.currentPeriodStart = now;
    sub.planId = planId;
    sub.status = "active";
    sub.paymentProvider = provider;
    sub.billingCycle = billingCycle;
    sub.externalCustomerId = externalCustomerId;
    if (externalSubscriptionId) sub.externalSubscriptionId = externalSubscriptionId;
    sub.currentPeriodEnd = periodEnd;
    sub.gracePeriodEndsAt = null;
    if (!isRenewal) {
      sub.canceledAt = null;
      sub.cancelAtPeriodEnd = false;
    }
  }
  await subRepo.save(sub);
  return sub;
}

export async function processPaymentCreated(payload: Record<string, unknown>) {
  const invoiceId = payload.invoiceId as string | undefined;
  const paymentId = payload.paymentId as string | undefined;
  if (!invoiceId) return;

  const { invoice: invRepo } = await repositories();
  const inv = await invRepo.findOne({ where: { id: invoiceId } });
  if (!inv) return;

  if (paymentId) inv.externalPaymentId = paymentId;
  if (inv.status === "pending" || !inv.status) inv.status = "pending";
  await invRepo.save(inv);
}

export async function processPaymentConfirmed(payload: Record<string, unknown>) {
  const invoiceId = payload.invoiceId as string | undefined;
  const paymentId = payload.paymentId as string | undefined;
  if (!invoiceId) return;

  const { invoice: invRepo } = await repositories();
  const inv = await invRepo.findOne({ where: { id: invoiceId } });
  if (!inv || inv.status === "paid") return;

  if (paymentId) inv.externalPaymentId = paymentId;
  inv.status = "confirmed";
  await invRepo.save(inv);
}

export async function processPaymentReceived(payload: Record<string, unknown>) {
  const tenantId = payload.tenantId as string;
  const invoiceId = payload.invoiceId as string | undefined;
  const paymentId = payload.paymentId as string | undefined;
  const planId = payload.planId as string | undefined;
  const provider = payload.provider as "asaas" | "stripe";
  const billingCycle = (payload.billingCycle as "monthly" | "yearly") ?? "monthly";
  const externalCustomerId = payload.externalCustomerId as string;
  const externalSubscriptionId = (payload.externalSubscriptionId as string) ?? null;
  const amountCents = payload.amountCents as number | undefined;

  const { invoice: invRepo, billingCustomer: custRepo } = await repositories();

  if (invoiceId) {
    const inv = await invRepo.findOne({ where: { id: invoiceId } });
    if (inv) {
      if (inv.status === "paid") return;
      inv.status = "paid";
      inv.paidAt = new Date();
      if (paymentId) inv.externalPaymentId = paymentId;
      if (payload.currency && typeof payload.currency === "string") {
        inv.currency = payload.currency.toUpperCase();
      }
      if (typeof payload.amountCents === "number") inv.amountCents = payload.amountCents;
      if (typeof payload.taxCents === "number") inv.taxCents = payload.taxCents;
      if (provider === "asaas") inv.nfStatus = "pending";
      await invRepo.save(inv);

      if (inv.couponId && inv.couponDiscountCents) {
        const { couponRedemption: redemptionRepo } = await repositories();
        const existing = await redemptionRepo.findOne({
          where: { invoiceId: inv.id, couponId: inv.couponId }
        });
        if (!existing) {
          await recordCouponRedemption({
            couponId: inv.couponId,
            tenantId,
            invoiceId: inv.id,
            discountCents: inv.couponDiscountCents,
            finalAmountCents: inv.amountCents
          });
        }
      }

      if (provider === "asaas" && paymentId) {
        const cust = await custRepo.findOne({ where: { tenantId } });
        await enqueueBillingJob("emit_nf", {
          invoiceId: inv.id,
          paymentId,
          tenantId,
          customerName: cust?.name ?? "",
          customerCpfCnpj: cust?.cpfCnpj ?? "",
          amountCents: inv.amountCents,
          description: inv.description ?? "Assinatura Orion Agency"
        });
      }
    }
  } else if (paymentId && tenantId && planId) {
    await invRepo.save(
      invRepo.create({
        tenantId,
        provider,
        externalPaymentId: paymentId,
        amountCents: amountCents ?? 0,
        currency: (payload.currency as string)?.toUpperCase() ?? (provider === "stripe" ? "USD" : "BRL"),
        status: "paid",
        paidAt: new Date(),
        nfStatus: provider === "asaas" ? "pending" : "not_applicable",
        description: "Assinatura Orion Agency"
      })
    );
  }

  if (tenantId && planId) {
    await activateProSubscription(
      tenantId,
      planId,
      provider,
      externalCustomerId,
      externalSubscriptionId,
      billingCycle
    );
  }
}

export async function processPaymentOverdue(payload: Record<string, unknown>) {
  const tenantId = payload.tenantId as string;
  if (!tenantId) return;
  const { subscription: subRepo, invoice: invRepo } = await repositories();
  const sub = await subRepo.findOne({ where: { tenantId } });
  if (!sub || sub.status === "canceled") return;

  sub.status = "past_due";
  if (!sub.gracePeriodEndsAt) {
    sub.gracePeriodEndsAt = addDays(new Date(), GRACE_DAYS);
  }
  await subRepo.save(sub);

  const invoiceId = payload.invoiceId as string | undefined;
  if (invoiceId) {
    const inv = await invRepo.findOne({ where: { id: invoiceId } });
    if (inv) {
      inv.status = "overdue";
      await invRepo.save(inv);
    }
  }
}

export async function processSubscriptionCanceled(payload: Record<string, unknown>) {
  const tenantId = payload.tenantId as string;
  if (!tenantId) return;
  const { subscription: subRepo, plan: planRepo } = await repositories();
  const sub = await subRepo.findOne({ where: { tenantId } });
  if (!sub) return;

  const freePlan = await planRepo.findOne({ where: { slug: "free" } });
  if (freePlan) sub.planId = freePlan.id;
  sub.status = "canceled";
  sub.canceledAt = new Date();
  sub.externalSubscriptionId = null;
  await subRepo.save(sub);
}

export async function emitNotaFiscal(payload: Record<string, unknown>) {
  const invoiceId = payload.invoiceId as string;
  const paymentId = payload.paymentId as string;
  const { invoice: invRepo } = await repositories();
  const inv = await invRepo.findOne({ where: { id: invoiceId } });
  if (!inv || inv.nfStatus === "issued") return;

  try {
    const nf = await emitAsaasNotaFiscal({
      paymentId,
      serviceDescription: (payload.description as string) ?? "Assinatura Orion Agency",
      valueCents: (payload.amountCents as number) ?? inv.amountCents,
      customerName: (payload.customerName as string) ?? "",
      customerCpfCnpj: (payload.customerCpfCnpj as string) ?? ""
    });
    let issued = nf;
    if (nf.status !== "AUTHORIZED" && nf.status !== "SCHEDULED") {
      try {
        issued = await authorizeAsaasNotaFiscal(nf.id);
      } catch {
        /* authorization may be async */
      }
    }
    inv.asaasInvoiceId = nf.id;
    inv.nfNumber = issued.number ?? null;
    inv.nfPdfUrl = issued.pdfUrl ?? null;
    inv.nfStatus = issued.pdfUrl || issued.number ? "issued" : "pending";
    inv.nfIssuedAt = inv.nfStatus === "issued" ? new Date() : null;
  } catch (err) {
    inv.nfStatus = "error";
    throw err;
  } finally {
    await invRepo.save(inv);
  }
}

/** Assinaturas pagas com período vencido → past_due + grace, ou downgrade se cancel agendado. */
export async function processExpiredSubscriptionPeriods() {
  const { subscription: subRepo, plan: planRepo } = await repositories();
  const now = new Date();
  const freePlan = await planRepo.findOne({ where: { slug: "free" } });
  let pastDue = 0;
  let downgraded = 0;

  const activeSubs = await subRepo
    .createQueryBuilder("s")
    .where("s.status = :status", { status: "active" })
    .andWhere("s.currentPeriodEnd IS NOT NULL")
    .andWhere("s.currentPeriodEnd < :now", { now })
    .getMany();

  for (const sub of activeSubs) {
    const plan = await planRepo.findOne({ where: { id: sub.planId } });
    if (!plan || plan.slug === "free") continue;

    if (sub.cancelAtPeriodEnd && freePlan) {
      sub.planId = freePlan.id;
      sub.status = "canceled";
      sub.canceledAt = now;
      sub.externalSubscriptionId = null;
      sub.cancelAtPeriodEnd = false;
      sub.gracePeriodEndsAt = null;
      await subRepo.save(sub);
      downgraded++;
      continue;
    }

    sub.status = "past_due";
    if (!sub.gracePeriodEndsAt) {
      sub.gracePeriodEndsAt = addDays(now, GRACE_DAYS);
    }
    await subRepo.save(sub);
    pastDue++;
  }

  return { pastDue, downgraded };
}

export async function suspendOverdueSubscriptions() {
  const { subscription: subRepo, plan: planRepo } = await repositories();
  const now = new Date();

  const overdue = await subRepo
    .createQueryBuilder("s")
    .where("s.status = :status", { status: "past_due" })
    .andWhere("s.gracePeriodEndsAt IS NOT NULL")
    .andWhere("s.gracePeriodEndsAt < :now", { now })
    .getMany();

  for (const sub of overdue) {
    sub.status = "suspended";
    await subRepo.save(sub);
  }

  const freePlan = await planRepo.findOne({ where: { slug: "free" } });
  if (freePlan) {
    const expiredTrials = await subRepo
      .createQueryBuilder("s")
      .where("s.planId = :planId", { planId: freePlan.id })
      .andWhere("s.status = :status", { status: "trialing" })
      .andWhere("s.currentPeriodEnd IS NOT NULL")
      .andWhere("s.currentPeriodEnd < :now", { now })
      .getMany();
    for (const sub of expiredTrials) {
      sub.status = "suspended";
      await subRepo.save(sub);
    }
    return overdue.length + expiredTrials.length;
  }

  return overdue.length;
}

export async function ensureFreeSubscription(tenantId: string): Promise<Subscription> {
  const { subscription: subRepo, plan: planRepo } = await repositories();
  let sub = await subRepo.findOne({ where: { tenantId } });
  if (sub) return sub;

  const freePlan = await planRepo.findOne({ where: { slug: "free" } });
  if (!freePlan) throw new Error("Free plan not seeded");

  sub = subRepo.create({
    tenantId,
    planId: freePlan.id,
    status: "trialing",
    billingCycle: "monthly",
    currentPeriodStart: new Date(),
    currentPeriodEnd: addDays(new Date(), freePlan.trialDays || 7)
  });
  return subRepo.save(sub);
}
