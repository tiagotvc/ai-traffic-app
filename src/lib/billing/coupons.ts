import "server-only";

import { randomUUID } from "crypto";

import { getDataSource } from "@/db/data-source";
import { repositories } from "@/db/repositories";
import type { DiscountCoupon } from "@/db/entities/DiscountCoupon";
import type { Plan } from "@/db/entities/Plan";
import type { PricingBreakdown } from "./pricing";

/** Piso da plataforma: a Asaas recusa cobrança com valor final abaixo de R$ 5,00
 * ("valor da cobrança menos o desconto" < mínimo) — nenhum cupom pode furar esse piso. */
export const MIN_CHECKOUT_CENTS = 500;

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
  // Cupons antigos podem ter minChargeCents abaixo do piso — o piso da plataforma prevalece.
  const floor = Math.max(coupon.minChargeCents ?? 0, MIN_CHECKOUT_CENTS);
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

/**
 * Registra o resgate e incrementa usedCount atomicamente numa transação. O UNIQUE em
 * coupon_redemptions("couponId","tenantId") torna o insert idempotente (retry de webhook ou
 * corrida concorrente cai no ON CONFLICT DO NOTHING) e fecha a brecha em que dois checkouts
 * concorrentes passavam na validação de maxUses antes de qualquer um dos dois ter pago.
 */
export async function recordCouponRedemption(input: {
  couponId: string;
  tenantId: string;
  userId?: string;
  invoiceId: string;
  discountCents: number;
  finalAmountCents: number;
}) {
  const ds = await getDataSource();

  await ds.transaction(async (manager) => {
    const inserted = await manager.query(
      `INSERT INTO coupon_redemptions
         (id, "couponId", "tenantId", "userId", "invoiceId", "discountCents", "finalAmountCents")
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT ("couponId", "tenantId") DO NOTHING
       RETURNING id`,
      [
        randomUUID(),
        input.couponId,
        input.tenantId,
        input.userId ?? null,
        input.invoiceId,
        input.discountCents,
        input.finalAmountCents
      ]
    );

    if (inserted.length === 0) {
      // já resgatado por este tenant (retry de webhook ou corrida concorrente) — idempotente
      return;
    }

    const incremented = await manager.query(
      `UPDATE discount_coupons
       SET "usedCount" = "usedCount" + 1, "updatedAt" = now()
       WHERE id = $1 AND ("maxUses" IS NULL OR "usedCount" < "maxUses")
       RETURNING "usedCount"`,
      [input.couponId]
    );

    if (incremented.length === 0) {
      // Pagamento já foi confirmado, não dá pra estornar por aqui — só alerta pro admin
      // desativar o cupom manualmente.
      // eslint-disable-next-line no-console
      console.warn(
        `[coupons] cupom ${input.couponId} excedeu maxUses no resgate (tenant ${input.tenantId})`
      );
    }
  });
}
