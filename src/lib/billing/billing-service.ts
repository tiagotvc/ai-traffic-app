import "server-only";

import { repositories } from "@/db/repositories";
import type { BillingCycle } from "./types";
import { getBillingProvider } from "./providers";
import { planListCents, resolvePlanMonthlyCents } from "./currency";
import { calculateCheckoutPricing } from "./pricing";
import { localDatePlusDays } from "./dates";
import { validateCouponForCheckout } from "./coupons";

export async function getOrCreateBillingCustomer(
  tenantId: string,
  input: {
    name: string;
    email: string;
    cpfCnpj?: string;
    phone?: string;
    postalCode?: string;
    address?: string;
    addressNumber?: string;
    city?: string;
    state?: string;
  }
) {
  const { billingCustomer: repo } = await repositories();
  let row = await repo.findOne({ where: { tenantId } });
  if (!row) {
    row = repo.create({
      tenantId,
      name: input.name,
      email: input.email,
      preferredProvider: "asaas"
    });
  }
  Object.assign(row, { ...input, preferredProvider: "asaas" });
  await repo.save(row);

  const provider = getBillingProvider("asaas");
  if (!row.asaasCustomerId) {
    const ext = await provider.createCustomer({
      name: input.name,
      email: input.email,
      cpfCnpj: input.cpfCnpj,
      phone: input.phone,
      postalCode: input.postalCode,
      address: input.address,
      addressNumber: input.addressNumber,
      city: input.city,
      state: input.state
    });
    row.asaasCustomerId = ext.id;
    await repo.save(row);
  }
  return row;
}

export async function startCheckout(input: {
  tenantId: string;
  userId?: string;
  planId: string;
  cycle: BillingCycle;
  billingType?: "PIX" | "CREDIT_CARD";
  installmentCount?: number;
  couponCode?: string;
  customer: {
    name: string;
    email: string;
    cpfCnpj?: string;
    phone?: string;
    postalCode?: string;
    address?: string;
    addressNumber?: string;
    city?: string;
    state?: string;
  };
  creditCardToken?: string;
  remoteIp?: string;
}) {
  const { plan: planRepo, invoice: invRepo } = await repositories();
  const plan = await planRepo.findOne({ where: { id: input.planId, isActive: true } });
  if (!plan || plan.slug === "free") throw new Error("Invalid plan");

  const billingType = input.billingType ?? "PIX";
  const currency = "BRL";
  let pricing = calculateCheckoutPricing({
    priceMonthlyCents: resolvePlanMonthlyCents(plan, currency),
    listCents: planListCents(plan, input.cycle, currency),
    cycle: input.cycle,
    provider: "asaas",
    billingType,
    installmentCount: input.installmentCount
  });

  let couponId: string | null = null;
  let couponDiscountCents: number | null = null;

  if (input.couponCode?.trim()) {
    const couponResult = await validateCouponForCheckout({
      code: input.couponCode,
      tenantId: input.tenantId,
      plan,
      pricing
    });
    if (!couponResult.ok) throw new Error(couponResult.error);
    pricing = couponResult.pricing;
    couponId = couponResult.coupon.id;
    couponDiscountCents = couponResult.discountCents;
  }

  const amountCents = pricing.finalCents;
  if (amountCents <= 0) throw new Error("Plan has no price");

  const billingCustomer = await getOrCreateBillingCustomer(input.tenantId, input.customer);
  const provider = getBillingProvider("asaas");
  const customerId = billingCustomer.asaasCustomerId!;

  const description = `Traffic AI ${plan.name} (${input.cycle}${pricing.discountPercent ? ` -${pricing.discountPercent}%` : ""})`;

  let result: {
    subscriptionId?: string;
    paymentId?: string;
    pixQrCode?: string;
    pixCopyPaste?: string;
    pixExpiresAt?: string;
    invoiceUrl?: string;
  };

  if (billingType === "CREDIT_CARD") {
    if (!input.creditCardToken) throw new Error("Token do cartão obrigatório");

    if (pricing.installmentCount >= 2) {
      const checkout = await provider.createCheckout({
        customerId,
        valueCents: amountCents,
        cycle: input.cycle,
        description,
        billingType: "CREDIT_CARD",
        creditCardToken: input.creditCardToken,
        installmentCount: pricing.installmentCount,
        remoteIp: input.remoteIp
      });
      result = checkout;
    } else {
      const sub = await provider.createSubscription({
        customerId,
        valueCents: amountCents,
        cycle: input.cycle,
        description,
        billingType: "CREDIT_CARD",
        creditCardToken: input.creditCardToken,
        remoteIp: input.remoteIp
      });
      result = {
        subscriptionId: sub.id,
        paymentId: sub.paymentId,
        invoiceUrl: undefined
      };
    }
  } else {
    result = await provider.createCheckout({
      customerId,
      valueCents: amountCents,
      cycle: input.cycle,
      description,
      billingType: "PIX"
    });
  }

  const inv = await invRepo.save(
    invRepo.create({
      tenantId: input.tenantId,
      planId: plan.id,
      provider: "asaas",
      externalPaymentId: result.paymentId ?? null,
      amountCents,
      status: "pending",
      billingType,
      billingCycle: input.cycle,
      dueDate: localDatePlusDays(3),
      pixQrCode: result.pixQrCode ?? null,
      pixCopyPaste: result.pixCopyPaste ?? null,
      pixExpiresAt: result.pixExpiresAt ? new Date(result.pixExpiresAt) : null,
      invoiceUrl: result.invoiceUrl ?? null,
      nfStatus: "pending",
      description: `Traffic AI ${plan.name}`,
      couponId,
      couponDiscountCents
    })
  );

  if (result.subscriptionId) {
    const { subscription: subRepo } = await repositories();
    let sub = await subRepo.findOne({ where: { tenantId: input.tenantId } });
    if (sub) {
      sub.externalSubscriptionId = result.subscriptionId;
      await subRepo.save(sub);
    }
  }

  return {
    ...result,
    invoiceId: inv.id,
    plan,
    amountCents,
    pricing
  };
}

export async function resolveTenantFromAsaasPayment(paymentCustomerId: string) {
  const { billingCustomer: repo } = await repositories();
  const cust = await repo.findOne({ where: { asaasCustomerId: paymentCustomerId } });
  return cust?.tenantId ?? null;
}

export async function resolveTenantFromStripeCustomer(stripeCustomerId: string) {
  const { billingCustomer: repo } = await repositories();
  const cust = await repo.findOne({ where: { stripeCustomerId } });
  return cust?.tenantId ?? null;
}
