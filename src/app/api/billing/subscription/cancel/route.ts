import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { getTenantSubscription } from "@/lib/billing/entitlements";
import { getBillingProvider } from "@/lib/billing/providers";
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
    const provider = getBillingProvider(sub.paymentProvider);
    await provider.cancelSubscription(sub.externalSubscriptionId, true);
    sub.cancelAtPeriodEnd = true;
    const { subscription: subRepo } = await repositories();
    await subRepo.save(sub);
    return NextResponse.json({ ok: true, cancelAtPeriodEnd: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error" },
      { status: 400 }
    );
  }
}
