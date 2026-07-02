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

/** Compartilhado entre subscription_canceled (Asaas/Stripe) e pix_auth_cancelled — mesma regra:
 * se já é um cancelamento gracioso nosso (cancelAtPeriodEnd), não derruba agora, quem faz isso na
 * hora certa é processExpiredSubscriptionPeriods (cron billing-worker). Senão, é cancelamento fora
 * de banda (ex: deletado direto no painel do provedor) — downgrade imediato. */
async function downgradeOrDeferCancellation(tenantId: string, logPrefix: string): Promise<void> {
  const { subscription: subRepo, plan: planRepo } = await repositories();
  const sub = await subRepo.findOne({ where: { tenantId } });
  if (!sub) return;

  const now = new Date();
  const gracefulCancelInProgress =
    sub.cancelAtPeriodEnd && sub.currentPeriodEnd != null && sub.currentPeriodEnd > now;

  if (gracefulCancelInProgress) {
    console.log(
      `[billing-jobs] ${logPrefix}: renovação já em cancelamento gracioso, mantendo acesso até ${sub.currentPeriodEnd?.toISOString()} tenantId=${tenantId}`
    );
    return;
  }

  const freePlan = await planRepo.findOne({ where: { slug: "free" } });
  if (freePlan) sub.planId = freePlan.id;
  sub.status = "canceled";
  sub.canceledAt = now;
  sub.externalSubscriptionId = null;
  await subRepo.save(sub);
  console.log(`[billing-jobs] ${logPrefix}: downgrade imediato aplicado tenantId=${tenantId}`);
}

export async function processSubscriptionCanceled(payload: Record<string, unknown>) {
  const tenantId = payload.tenantId as string;
  if (!tenantId) return;
  await downgradeOrDeferCancellation(tenantId, "subscription_canceled");
}

/** PAYMENT_REFUNDED / PAYMENT_PARTIALLY_REFUNDED (Asaas) e charge.refunded / refund.created (Stripe). */
export async function processPaymentRefunded(payload: Record<string, unknown>) {
  const invoiceId = payload.invoiceId as string | undefined;
  const partial = Boolean(payload.partial);
  if (!invoiceId) {
    console.warn(`[billing-jobs] payment_refunded sem invoiceId resolvido, payload=${JSON.stringify(payload)}`);
    return;
  }
  const { invoice: invRepo } = await repositories();
  const inv = await invRepo.findOne({ where: { id: invoiceId } });
  if (!inv) return;
  inv.status = partial ? "partially_refunded" : "refunded";
  await invRepo.save(inv);
  // Decisão de negócio (suspender ou não a assinatura) fica para revisão manual — só registramos
  // o estado da fatura e deixamos bem visível no log/aba de eventos do billing.
  console.warn(
    `[billing-jobs] REEMBOLSO registrado invoiceId=${invoiceId} tenantId=${inv.tenantId} partial=${partial} — revisar assinatura manualmente`
  );
}

/** PAYMENT_CHARGEBACK_REQUESTED (Asaas) e charge.dispute.created (Stripe). */
export async function processPaymentChargeback(payload: Record<string, unknown>) {
  const invoiceId = payload.invoiceId as string | undefined;
  if (!invoiceId) {
    console.warn(`[billing-jobs] payment_chargeback sem invoiceId resolvido, payload=${JSON.stringify(payload)}`);
    return;
  }
  const { invoice: invRepo } = await repositories();
  const inv = await invRepo.findOne({ where: { id: invoiceId } });
  if (!inv) return;
  inv.status = "chargeback";
  await invRepo.save(inv);
  console.warn(
    `[billing-jobs] CHARGEBACK registrado invoiceId=${invoiceId} tenantId=${inv.tenantId} — revisar assinatura manualmente`
  );
}

/** SUBSCRIPTION_INACTIVATED (Asaas) — o próprio provedor decidiu inativar, não é iniciativa nossa. */
export async function processSubscriptionInactivated(payload: Record<string, unknown>) {
  const tenantId = payload.tenantId as string;
  if (!tenantId) return;
  const { subscription: subRepo } = await repositories();
  const sub = await subRepo.findOne({ where: { tenantId } });
  if (!sub || sub.status === "canceled") return;
  sub.status = "suspended";
  await subRepo.save(sub);
  console.warn(`[billing-jobs] subscription_inactivated: suspenso pelo provedor tenantId=${tenantId}`);
}

/** customer.subscription.updated (Stripe) — hoje só reagimos à mudança de cancel_at_period_end. */
export async function processSubscriptionUpdated(payload: Record<string, unknown>) {
  const tenantId = payload.tenantId as string;
  if (!tenantId) return;
  const cancelAtPeriodEnd = payload.cancelAtPeriodEnd as boolean | undefined;
  if (cancelAtPeriodEnd === undefined) return;

  const { subscription: subRepo } = await repositories();
  const sub = await subRepo.findOne({ where: { tenantId } });
  if (!sub) return;

  if (sub.cancelAtPeriodEnd === cancelAtPeriodEnd) return;

  sub.cancelAtPeriodEnd = cancelAtPeriodEnd;
  await subRepo.save(sub);
  console.log(
    `[billing-jobs] subscription_updated: cancelAtPeriodEnd=${cancelAtPeriodEnd} aplicado fora do app (ex: Stripe customer portal) tenantId=${tenantId}`
  );
}

/** INVOICE_AUTHORIZED (nota fiscal, Asaas) — a autorização pode terminar de forma assíncrona; este
 * webhook é o sinal definitivo, complementando o try/catch em emitNotaFiscal. */
export async function processNfAuthorized(payload: Record<string, unknown>) {
  const invoiceId = payload.invoiceId as string | undefined;
  if (!invoiceId) {
    console.warn(`[billing-jobs] nf_authorized sem invoiceId resolvido, payload=${JSON.stringify(payload)}`);
    return;
  }
  const { invoice: invRepo } = await repositories();
  const inv = await invRepo.findOne({ where: { id: invoiceId } });
  if (!inv) return;
  inv.nfStatus = "issued";
  if (payload.nfeNumber) inv.nfNumber = payload.nfeNumber as string;
  if (payload.nfePdfUrl) inv.nfPdfUrl = payload.nfePdfUrl as string;
  inv.nfIssuedAt = new Date();
  await invRepo.save(inv);
}

/** INVOICE_ERROR (nota fiscal, Asaas). */
export async function processNfError(payload: Record<string, unknown>) {
  const invoiceId = payload.invoiceId as string | undefined;
  if (!invoiceId) {
    console.warn(`[billing-jobs] nf_error sem invoiceId resolvido, payload=${JSON.stringify(payload)}`);
    return;
  }
  const { invoice: invRepo } = await repositories();
  const inv = await invRepo.findOne({ where: { id: invoiceId } });
  if (!inv) return;
  inv.nfStatus = "error";
  await invRepo.save(inv);
  console.error(`[billing-jobs] NF com erro invoiceId=${invoiceId} tenantId=${inv.tenantId}`);
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

/** PIX_AUTOMATIC_RECURRING_AUTHORIZATION_ACTIVATED — só marca a autorização como ativa. A
 * ativação da assinatura em si acontece pelo fluxo normal de PAYMENT_RECEIVED do 1º pagamento
 * (a mesma chamada que cria a autorização já gera essa cobrança imediata) — ver
 * src/app/api/billing/checkout/route.ts, que pré-cria o Invoice com planId pra esse pagamento
 * ser reconhecido corretamente quando o webhook chegar. */
export async function processPixAuthActivated(payload: Record<string, unknown>) {
  const authorizationId = payload.authorizationId as string | undefined;
  if (!authorizationId) return;
  const { pixAutomaticAuthorization: pixAuthRepo } = await repositories();
  const auth = await pixAuthRepo.findOne({ where: { id: authorizationId } });
  if (!auth) return;
  auth.status = "active";
  await pixAuthRepo.save(auth);
  console.log(`[billing-jobs] pix_auth_activated id=${authorizationId} tenantId=${auth.tenantId}`);
}

/** PIX_AUTOMATIC_RECURRING_AUTHORIZATION_CANCELLED — cliente ou banco cancelou a autorização de
 * recorrência. Aplica a mesma regra de cancelamento gracioso vs. imediato da assinatura. */
export async function processPixAuthCancelled(payload: Record<string, unknown>) {
  const authorizationId = payload.authorizationId as string | undefined;
  const tenantId = payload.tenantId as string | undefined;
  if (!authorizationId || !tenantId) return;
  const { pixAutomaticAuthorization: pixAuthRepo } = await repositories();
  const auth = await pixAuthRepo.findOne({ where: { id: authorizationId } });
  if (auth) {
    auth.status = "cancelled";
    await pixAuthRepo.save(auth);
  }
  await downgradeOrDeferCancellation(tenantId, "pix_auth_cancelled");
}

/** PIX_AUTOMATIC_RECURRING_AUTHORIZATION_EXPIRED — autorização expirou (limite de validade do
 * Bacen ou revogada passivamente pelo banco do cliente) sem que o motor recorrente tenha causado
 * isso. Cliente precisa reautorizar; tratamos como atraso (mesma carência de payment_overdue). */
export async function processPixAuthExpired(payload: Record<string, unknown>) {
  const authorizationId = payload.authorizationId as string | undefined;
  const tenantId = payload.tenantId as string | undefined;
  if (!authorizationId || !tenantId) return;
  const { pixAutomaticAuthorization: pixAuthRepo } = await repositories();
  const auth = await pixAuthRepo.findOne({ where: { id: authorizationId } });
  if (auth) {
    auth.status = "expired";
    await pixAuthRepo.save(auth);
  }
  console.warn(
    `[billing-jobs] pix_auth_expired id=${authorizationId} tenantId=${tenantId} — cliente precisa reautorizar`
  );
  await processPaymentOverdue({ tenantId });
}

/** PIX_AUTOMATIC_RECURRING_AUTHORIZATION_REFUSED — a autorização nunca chegou a ativar (recusada
 * já na primeira tentativa). A assinatura não foi ativada por essa autorização, então não mexemos
 * no status dela — só registramos para revisão manual. */
export async function processPixAuthRefused(payload: Record<string, unknown>) {
  const authorizationId = payload.authorizationId as string | undefined;
  if (!authorizationId) return;
  const { pixAutomaticAuthorization: pixAuthRepo } = await repositories();
  const auth = await pixAuthRepo.findOne({ where: { id: authorizationId } });
  if (!auth) return;
  auth.status = "refused";
  await pixAuthRepo.save(auth);
  console.warn(
    `[billing-jobs] pix_auth_refused id=${authorizationId} tenantId=${auth.tenantId} — revisar manualmente`
  );
}

/** charge.dispute.closed (Stripe) — resolução de uma disputa aberta por charge.dispute.created.
 * "won": revertemos o status de chargeback pro que a fatura tinha antes (paid). "lost"/outros:
 * mantemos chargeback, só confirmamos no log que foi finalizado (não fica mais "em aberto"). */
export async function processDisputeClosed(payload: Record<string, unknown>) {
  const invoiceId = payload.invoiceId as string | undefined;
  const disputeStatus = payload.disputeStatus as string | undefined;
  if (!invoiceId) {
    console.warn(`[billing-jobs] payment_dispute_closed sem invoiceId resolvido, payload=${JSON.stringify(payload)}`);
    return;
  }
  const { invoice: invRepo } = await repositories();
  const inv = await invRepo.findOne({ where: { id: invoiceId } });
  if (!inv) return;

  if (disputeStatus === "won") {
    inv.status = "paid";
    await invRepo.save(inv);
    console.log(`[billing-jobs] disputa GANHA, fatura revertida pra paid invoiceId=${invoiceId} tenantId=${inv.tenantId}`);
  } else {
    console.warn(
      `[billing-jobs] disputa finalizada (${disputeStatus ?? "desconhecido"}) invoiceId=${invoiceId} tenantId=${inv.tenantId} — chargeback mantido`
    );
  }
}
