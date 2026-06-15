import "server-only";

import { repositories } from "@/db/repositories";
import type { PaymentProvider } from "./types";
import { getAsaasFinanceBalance } from "@/lib/asaas/finance";
import { getStripeBalance } from "@/lib/stripe/balance";

type PeriodFilter = { from?: Date; to?: Date };

export async function getFinanceSummary(filter?: PeriodFilter) {
  const { invoice: invRepo, subscription: subRepo, plan: planRepo } = await repositories();

  const qb = invRepo
    .createQueryBuilder("inv")
    .select("inv.provider", "provider")
    .addSelect("inv.currency", "currency")
    .addSelect("SUM(inv.amountCents)", "revenueCents")
    .addSelect("COUNT(*)", "count")
    .where("inv.status = :paid", { paid: "paid" });

  if (filter?.from) {
    qb.andWhere("inv.paidAt >= :from", { from: filter.from });
  }
  if (filter?.to) {
    qb.andWhere("inv.paidAt <= :to", { to: filter.to });
  }

  qb.groupBy("inv.provider").addGroupBy("inv.currency");

  const revenueRows = await qb.getRawMany<{
    provider: PaymentProvider;
    currency: string;
    revenueCents: string;
    count: string;
  }>();

  const pendingQb = invRepo
    .createQueryBuilder("inv")
    .select("inv.provider", "provider")
    .addSelect("inv.currency", "currency")
    .addSelect("SUM(inv.amountCents)", "pendingCents")
    .addSelect("COUNT(*)", "count")
    .where("inv.status IN (:...statuses)", { statuses: ["pending", "confirmed", "overdue"] })
    .groupBy("inv.provider")
    .addGroupBy("inv.currency");

  const pendingRows = await pendingQb.getRawMany<{
    provider: PaymentProvider;
    currency: string;
    pendingCents: string;
    count: string;
  }>();

  const refundedQb = invRepo
    .createQueryBuilder("inv")
    .select("inv.provider", "provider")
    .addSelect("inv.currency", "currency")
    .addSelect("SUM(inv.amountCents)", "refundedCents")
    .addSelect("COUNT(*)", "count")
    .where("inv.status = :refunded", { refunded: "refunded" })
    .groupBy("inv.provider")
    .addGroupBy("inv.currency");

  const refundedRows = await refundedQb.getRawMany<{
    provider: PaymentProvider;
    currency: string;
    refundedCents: string;
    count: string;
  }>();

  const activeSubs = await subRepo.find({ where: { status: "active" } });
  const plans = await planRepo.find();
  const planMap = new Map(plans.map((p) => [p.id, p]));

  const mrrByProvider: Record<string, { cents: number; currency: string; count: number }> = {};

  for (const sub of activeSubs) {
    const plan = planMap.get(sub.planId);
    if (!plan || plan.slug === "free") continue;
    const provider = sub.paymentProvider ?? "asaas";
    const currency = provider === "stripe" ? "USD" : "BRL";
    const monthly =
      sub.billingCycle === "yearly" && plan.priceYearlyCents > 0
        ? Math.round(plan.priceYearlyCents / 12)
        : provider === "stripe"
          ? plan.priceMonthlyCents
          : plan.externalPrices?.asaas?.monthlyCents ?? plan.priceMonthlyCents;

    const key = `${provider}:${currency}`;
    if (!mrrByProvider[key]) mrrByProvider[key] = { cents: 0, currency, count: 0 };
    mrrByProvider[key].cents += monthly;
    mrrByProvider[key].count += 1;
  }

  const providers = {
    asaas: buildProviderBlock("asaas", "BRL", revenueRows, pendingRows, refundedRows, mrrByProvider),
    stripe: buildProviderBlock("stripe", "USD", revenueRows, pendingRows, refundedRows, mrrByProvider)
  };

  return { providers, generatedAt: new Date().toISOString() };
}

function buildProviderBlock(
  provider: PaymentProvider,
  defaultCurrency: string,
  revenueRows: Array<{ provider: string; currency: string; revenueCents: string; count: string }>,
  pendingRows: Array<{ provider: string; currency: string; pendingCents: string; count: string }>,
  refundedRows: Array<{ provider: string; currency: string; refundedCents: string; count: string }>,
  mrrByProvider: Record<string, { cents: number; currency: string; count: number }>
) {
  const rev = revenueRows.find((r) => r.provider === provider);
  const pend = pendingRows.find((r) => r.provider === provider);
  const ref = refundedRows.find((r) => r.provider === provider);
  const mrrKey = Object.keys(mrrByProvider).find((k) => k.startsWith(`${provider}:`));
  const mrr = mrrKey ? mrrByProvider[mrrKey] : null;

  return {
    provider,
    currency: rev?.currency ?? pend?.currency ?? mrr?.currency ?? defaultCurrency,
    revenueCents: Number(rev?.revenueCents ?? 0),
    paidInvoiceCount: Number(rev?.count ?? 0),
    pendingCents: Number(pend?.pendingCents ?? 0),
    pendingCount: Number(pend?.count ?? 0),
    refundedCents: Number(ref?.refundedCents ?? 0),
    refundedCount: Number(ref?.count ?? 0),
    mrrCents: mrr?.cents ?? 0,
    activeSubscriptions: mrr?.count ?? 0
  };
}

export async function getProviderBalances() {
  const asaas = await getAsaasFinanceBalance();
  const stripe = await getStripeBalance();
  return {
    asaas,
    stripe,
    fetchedAt: new Date().toISOString()
  };
}

export async function listFinanceInvoices(input: {
  provider?: PaymentProvider;
  limit?: number;
}) {
  const { invoice: invRepo } = await repositories();
  const rows = await invRepo.find({
    where: input.provider ? { provider: input.provider } : {},
    order: { createdAt: "DESC" },
    take: input.limit ?? 50
  });
  return rows;
}
