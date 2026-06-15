import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { repositories } from "@/db/repositories";
import { createStripeBillingPortalSession } from "@/lib/stripe/checkout";
import { getAppBaseUrl } from "@/lib/app-url";
import { isStripeConfigured } from "@/lib/stripe/client";
import { isWorkspaceAdmin } from "@/lib/workspace-members";

export async function POST(req: Request) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json({ ok: false, error: "Stripe not configured" }, { status: 503 });
    }

    const { tenant, user } = await getAppContext();
    const admin = await isWorkspaceAdmin(tenant.id, user.id);
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Admin required" }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as { locale?: string };
    const locale = (body.locale ?? "en").replace(/^\//, "");

    const { subscription: subRepo, billingCustomer: custRepo } = await repositories();
    const sub = await subRepo.findOne({ where: { tenantId: tenant.id } });
    if (!sub || sub.paymentProvider !== "stripe") {
      return NextResponse.json({ ok: false, error: "No Stripe subscription" }, { status: 400 });
    }

    const cust = await custRepo.findOne({ where: { tenantId: tenant.id } });
    if (!cust?.stripeCustomerId) {
      return NextResponse.json({ ok: false, error: "Stripe customer missing" }, { status: 400 });
    }

    const session = await createStripeBillingPortalSession({
      customerId: cust.stripeCustomerId,
      returnUrl: `${getAppBaseUrl()}/${locale}/billing`
    });

    if (!session.url) {
      return NextResponse.json({ ok: false, error: "Portal URL missing" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, portalUrl: session.url });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Portal failed" },
      { status: 400 }
    );
  }
}
