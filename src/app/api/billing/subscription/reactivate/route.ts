import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { getTenantSubscription } from "@/lib/billing/entitlements";
import { recordBillingEvent } from "@/lib/billing/jobs";
import { resumeStripeSubscription } from "@/lib/stripe/checkout";
import { isWorkspaceAdmin } from "@/lib/workspace-members";
import { repositories } from "@/db/repositories";

/**
 * Desfaz um cancelamento de renovação agendado. Só existe caminho de reativação de verdade para
 * Stripe (cancel_at_period_end é reversível na própria API). Asaas não tem "cancelar só a
 * renovação" nativo — a assinatura já foi deletada de fato quando o usuário cancelou (ver
 * src/app/api/billing/subscription/cancel/route.ts) — reativar exigiria criar uma assinatura nova
 * via checkout, não um "desfazer".
 */
export async function POST() {
  try {
    const { tenant, user } = await getAppContext();
    if (!(await isWorkspaceAdmin(tenant.id, user.id))) {
      return NextResponse.json({ ok: false, error: "Admin required" }, { status: 403 });
    }
    const { subscription: sub } = await getTenantSubscription(tenant.id);
    if (!sub.cancelAtPeriodEnd) {
      return NextResponse.json({ ok: false, error: "No pending cancellation" }, { status: 400 });
    }

    if (sub.paymentProvider === "asaas") {
      return NextResponse.json(
        {
          ok: false,
          error: "asaas_reactivation_requires_new_checkout",
          message:
            "Asaas não permite desfazer o cancelamento — a assinatura já foi removida. É necessário assinar novamente pelo checkout."
        },
        { status: 400 }
      );
    }

    if (!sub.externalSubscriptionId) {
      return NextResponse.json({ ok: false, error: "No active paid subscription" }, { status: 400 });
    }

    await resumeStripeSubscription(sub.externalSubscriptionId);
    sub.cancelAtPeriodEnd = false;
    const { subscription: subRepo } = await repositories();
    await subRepo.save(sub);

    await recordBillingEvent({
      provider: "stripe",
      eventType: "renewal_reactivated_by_user",
      idempotencyKey: `internal:renewal-reactivated:${sub.id}:${Date.now()}`,
      tenantId: tenant.id,
      payload: { subscriptionId: sub.id, reactivatedByUserId: user.id }
    });

    return NextResponse.json({ ok: true, cancelAtPeriodEnd: false });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error" },
      { status: 400 }
    );
  }
}
