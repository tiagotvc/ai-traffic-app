import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext } from "@/lib/app-context";
import { getOrCreateBillingCustomer } from "@/lib/billing/billing-service";
import { tokenizeAsaasCreditCard } from "@/lib/billing/providers/asaas-provider";
import { isWorkspaceAdmin } from "@/lib/workspace-members";

function clientIp(req: Request): string | undefined {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim();
  return req.headers.get("x-real-ip") ?? undefined;
}

const bodySchema = z.object({
  customer: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    cpfCnpj: z.string().min(11),
    phone: z.string().optional(),
    postalCode: z.string().min(8),
    address: z.string().optional(),
    addressNumber: z.string().min(1),
    city: z.string().optional(),
    state: z.string().optional()
  }),
  creditCard: z.object({
    holderName: z.string().min(2),
    number: z.string().min(13),
    expiryMonth: z.string().min(1),
    expiryYear: z.string().min(4),
    ccv: z.string().min(3)
  })
});

export async function POST(req: Request) {
  try {
    const { tenant, user } = await getAppContext();
    if (!(await isWorkspaceAdmin(tenant.id, user.id))) {
      return NextResponse.json({ ok: false, error: "Admin required" }, { status: 403 });
    }

    const body = bodySchema.parse(await req.json());
    const billingCustomer = await getOrCreateBillingCustomer(tenant.id, body.customer);
    const remoteIp = clientIp(req);

    const tok = await tokenizeAsaasCreditCard({
      customerId: billingCustomer.asaasCustomerId!,
      holderName: body.creditCard.holderName,
      number: body.creditCard.number,
      expiryMonth: body.creditCard.expiryMonth,
      expiryYear: body.creditCard.expiryYear,
      ccv: body.creditCard.ccv,
      holderEmail: body.customer.email,
      holderCpfCnpj: body.customer.cpfCnpj,
      holderPostalCode: body.customer.postalCode,
      holderAddressNumber: body.customer.addressNumber,
      holderPhone: body.customer.phone ?? "",
      remoteIp
    });

    return NextResponse.json({
      ok: true,
      creditCardToken: tok.creditCardToken,
      creditCardNumber: tok.creditCardNumber,
      creditCardBrand: tok.creditCardBrand
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tokenization failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
