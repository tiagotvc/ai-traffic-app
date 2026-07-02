import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { getTenantSubscription } from "@/lib/billing/entitlements";
import { getBillingProvider } from "@/lib/billing/providers";
import { recordBillingEvent } from "@/lib/billing/jobs";
import { cancelAsaasPixAutomaticAuthorization } from "@/lib/asaas/pix-automatic";
import { isWorkspaceAdmin } from "@/lib/workspace-members";
import { repositories } from "@/db/repositories";

export async function POST() {
  try {
    const { tenant, user } = await getAppContext();
    if (!(await isWorkspaceAdmin(tenant.id, user.id))) {
      return NextResponse.json({ ok: false, error: "Admin required" }, { status: 403 });
    }
    const { subscription: sub } = await getTenantSubscription(tenant.id);
    if (!sub.externalSubscriptionId || !sub.paymentProvider) {
      return NextResponse.json({ ok: false, error: "No active paid subscription" }, { status: 400 });
    }

    // Pix Automático guarda o id da AUTORIZAÇÃO em externalSubscriptionId, não um id de assinatura
    // — precisa de um endpoint de cancelamento diferente (senão chamaríamos DELETE /subscriptions
    // no recurso errado).
    const { pixAutomaticAuthorization: pixAuthRepo, subscription: subRepo } = await repositories();
    const activePixAuth = await pixAuthRepo.findOne({
      where: { tenantId: tenant.id, subscriptionId: sub.id }
    });

    if (activePixAuth && (activePixAuth.status === "active" || activePixAuth.status === "pending")) {
      await cancelAsaasPixAutomaticAuthorization(activePixAuth.asaasAuthorizationId);
    } else {
      const provider = getBillingProvider(sub.paymentProvider);
      await provider.cancelSubscription(sub.externalSubscriptionId, true);
    }

    sub.cancelAtPeriodEnd = true;
    await subRepo.save(sub);

    // Registrado aqui (não depende de webhook) porque é a única fonte confiável do momento em
    // que o usuário pediu o cancelamento — mostrado na aba "Eventos" do billing.
    await recordBillingEvent({
      provider: sub.paymentProvider,
      eventType: "renewal_canceled_by_user",
      idempotencyKey: `internal:renewal-canceled:${sub.id}:${sub.currentPeriodEnd?.toISOString() ?? "unknown"}`,
      tenantId: tenant.id,
      payload: {
        subscriptionId: sub.id,
        accessUntil: sub.currentPeriodEnd,
        canceledByUserId: user.id
      }
    });

    return NextResponse.json({ ok: true, cancelAtPeriodEnd: true, accessUntil: sub.currentPeriodEnd });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error" },
      { status: 400 }
    );
  }
}
