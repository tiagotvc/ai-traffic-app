import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { getAppContext } from "@/lib/app-context";
import { getOrCreateBillingCustomer } from "@/lib/billing/billing-service";
import { resolveOrCreateAnonymousTenant } from "@/lib/billing/anonymous-checkout";
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
    // Documento livre (aceita passaporte de estrangeiro) — a Asaas valida o que precisar.
    cpfCnpj: z.string().min(5),
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
    const body = bodySchema.parse(await req.json());

    const session = await auth();
    // Mesmo critério do /api/billing/checkout: só reaproveita a sessão atual quando o e-mail
    // do formulário bate com o da conta logada — senão é checkout público pra outra conta.
    const sessionMatchesFormEmail =
      !!session?.user?.email &&
      session.user.email.toLowerCase().trim() === body.customer.email.toLowerCase().trim();

    let tenantId: string;

    if (sessionMatchesFormEmail) {
      const { tenant, user } = await getAppContext();
      if (!(await isWorkspaceAdmin(tenant.id, user.id))) {
        return NextResponse.json({ ok: false, error: "Admin required" }, { status: 403 });
      }
      tenantId = tenant.id;
    } else {
      // Checkout público (cartão): mesma resolução de conta anônima do /api/billing/checkout.
      // A conta fica pendente (sem senha/sessão); a chamada seguinte ao /api/billing/checkout
      // reutiliza essa mesma conta pelo e-mail e só estabelece sessão se o pagamento passar.
      const resolved = await resolveOrCreateAnonymousTenant(body.customer.name, body.customer.email);
      if (resolved.conflict) {
        return NextResponse.json(
          {
            ok: false,
            error: "ACCOUNT_EXISTS",
            message: "Já existe uma conta com esse e-mail. Faça login para continuar."
          },
          { status: 409 }
        );
      }
      tenantId = resolved.tenantId;
    }

    const billingCustomer = await getOrCreateBillingCustomer(tenantId, body.customer);
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
