import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { getEntitlements, getTenantSubscription, subscriptionToJson } from "@/lib/billing/entitlements";
import { isWorkspaceAdmin } from "@/lib/workspace-members";

export async function GET() {
  try {
    const { tenant, user } = await getAppContext();
    const { subscription, plan } = await getTenantSubscription(tenant.id);
    const entitlements = await getEntitlements(tenant.id);
    const canManageBilling = await isWorkspaceAdmin(tenant.id, user.id);
    return NextResponse.json({
      ok: true,
      subscription: subscriptionToJson(subscription, plan),
      entitlements,
      canManageBilling
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error" },
      { status: 500 }
    );
  }
}
