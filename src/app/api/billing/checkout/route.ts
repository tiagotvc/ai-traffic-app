import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext } from "@/lib/app-context";
import { startCheckout, startStripeCheckout } from "@/lib/billing/billing-service";
import { resolveCheckoutProvider } from "@/lib/billing/providers";
import { isWorkspaceAdmin } from "@/lib/workspace-members";

function clientIp(req: Request): string | undefined {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim();
  return req.headers.get("x-real-ip") ?? undefined;
}

const customerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  cpfCnpj: z.string().optional(),
  phone: z.string().optional(),
  postalCode: z.string().optional(),
  address: z.string().optional(),
  addressNumber: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional()
});

const bodySchema = z.object({
  planId: z.string().uuid(),
  cycle: z.enum(["monthly", "yearly"]),
  provider: z.enum(["asaas", "stripe"]).optional(),
  paymentRegion: z.enum(["br", "intl"]).optional(),
  locale: z.string().optional(),
  billingType: z.enum(["PIX", "CREDIT_CARD"]).optional(),
  installmentCount: z.number().int().min(1).max(12).optional(),
  couponCode: z.string().optional(),
  creditCardToken: z.string().optional(),
  customer: customerSchema
});

export async function POST(req: Request) {
  try {
    const { tenant, user } = await getAppContext();
    const admin = await isWorkspaceAdmin(tenant.id, user.id);
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Admin required" }, { status: 403 });
    }

    const body = bodySchema.parse(await req.json());
    const locale = body.locale ?? "pt-BR";
    const provider =
      body.provider ?? resolveCheckoutProvider(locale, body.paymentRegion ?? null);

    if (provider === "stripe") {
      const result = await startStripeCheckout({
        tenantId: tenant.id,
        planId: body.planId,
        cycle: body.cycle,
        locale,
        customer: { name: body.customer.name, email: body.customer.email }
      });
      return NextResponse.json({
        ok: true,
        provider: "stripe",
        checkoutUrl: result.checkoutUrl,
        invoiceId: result.invoiceId,
        amountCents: result.amountCents
      });
    }

    if (!body.customer.cpfCnpj) {
      return NextResponse.json({ ok: false, error: "CPF/CNPJ required" }, { status: 400 });
    }

    if (body.billingType === "CREDIT_CARD" && !body.creditCardToken) {
      return NextResponse.json({ ok: false, error: "Card token required" }, { status: 400 });
    }

    if (body.billingType === "CREDIT_CARD") {
      if (!body.customer.postalCode || !body.customer.addressNumber) {
        return NextResponse.json({ ok: false, error: "Address required for card" }, { status: 400 });
      }
    }

    const result = await startCheckout({
      tenantId: tenant.id,
      userId: user.id,
      planId: body.planId,
      couponCode: body.couponCode,
      cycle: body.cycle,
      billingType: body.billingType,
      installmentCount: body.installmentCount,
      customer: body.customer,
      creditCardToken: body.creditCardToken,
      remoteIp: clientIp(req)
    });

    return NextResponse.json({ ok: true, provider: "asaas", ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
