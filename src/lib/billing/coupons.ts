import "server-only";

import { repositories } from "@/db/repositories";
import type { DiscountCoupon } from "@/db/entities/DiscountCoupon";
import type { Plan } from "@/db/entities/Plan";
import type { PricingBreakdown } from "./pricing";

/** Asaas não exige mínimo fixo; usamos R$ 1,00 como piso seguro para testes. */
export const MIN_CHECKOUT_CENTS = 100;

export type CouponValidationResult = {
  ok: true;
  coupon: DiscountCoupon;
  discountCents: number;
  finalCents: number;
  pricing: PricingBreakdown & {
    couponCode: string;
    couponPercent: number;
    couponCents: number;
  };
} | {
  ok: false;
  error: string;
};

export async function findCouponByCode(code: string) {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;
  const { discountCoupon: repo } = await repositories();
  return repo.findOne({ where: { code: normalized } });
}

export async function validateCouponForCheckout(input: {
  code: string;
  /** Ausente = preview anônimo (checkout público, conta ainda não existe) — pula a checagem de
   * "já usado nesta conta"; a validação final roda de novo com o tenantId real na hora de fechar o
   * pedido (startCheckout), então isso não abre brecha pra reuso indevido do cupom. */
  tenantId?: string;
  plan: Plan;
  pricing: PricingBreakdown;
}): Promise<CouponValidationResult> {
  const coupon = await findCouponByCode(input.code);
  if (!coupon) return { ok: false, error: "Cupom inválido" };
  if (!coupon.isActive) return { ok: false, error: "Cupom inativo" };

  const now = new Date();
  if (coupon.validFrom && coupon.validFrom > now) {
    return { ok: false, error: "Cupom ainda não está válido" };
  }
  if (coupon.validUntil && coupon.validUntil < now) {
    return { ok: false, error: "Cupom expirado" };
  }
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
    return { ok: false, error: "Cupom esgotado" };
  }

  if (coupon.allowedPlanSlugs?.length && !coupon.allowedPlanSlugs.includes(input.plan.slug)) {
    return { ok: false, error: "Cupom não válido para este plano" };
  }

  if (input.tenantId) {
    const { couponRedemption: redemptionRepo } = await repositories();
    const alreadyUsed = await redemptionRepo.findOne({
      where: { couponId: coupon.id, tenantId: input.tenantId }
    });
    if (alreadyUsed) {
      return { ok: false, error: "Cupom já utilizado nesta conta" };
    }
  }

  const pct = Math.min(100, Math.max(0, coupon.percentOff));
  const couponCents = Math.round((input.pricing.finalCents * pct) / 100);
  let finalCents = input.pricing.finalCents - couponCents;
  const floor = coupon.minChargeCents ?? MIN_CHECKOUT_CENTS;
  if (finalCents < floor) {
    finalCents = floor;
  }

  const actualDiscount = input.pricing.finalCents - finalCents;

  return {
    ok: true,
    coupon,
    discountCents: actualDiscount,
    finalCents,
    pricing: {
      ...input.pricing,
      finalCents,
      couponCode: coupon.code,
      couponPercent: pct,
      couponCents: actualDiscount,
      installmentValueCents:
        input.pricing.installmentCount >= 2
          ? Math.round(finalCents / input.pricing.installmentCount)
          : input.pricing.installmentValueCents
    }
  };
}

export async function recordCouponRedemption(input: {
  couponId: string;
  tenantId: string;
  userId?: string;
  invoiceId: string;
  discountCents: number;
  finalAmountCents: number;
}) {
  const { discountCoupon: couponRepo, couponRedemption: redemptionRepo } = await repositories();

  await redemptionRepo.save(
    redemptionRepo.create({
      couponId: input.couponId,
      tenantId: input.tenantId,
      userId: input.userId ?? null,
      invoiceId: input.invoiceId,
      discountCents: input.discountCents,
      finalAmountCents: input.finalAmountCents
    })
  );

  await couponRepo.increment({ id: input.couponId }, "usedCount", 1);
}
