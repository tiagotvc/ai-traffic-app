import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { getAppContext } from "@/lib/app-context";
import { startCheckout, startStripeCheckout } from "@/lib/billing/billing-service";
import { resolveOrCreateAnonymousTenant } from "@/lib/billing/anonymous-checkout";
import { resolveCheckoutProvider } from "@/lib/billing/providers";

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
  billingType: z.enum(["PIX", "CREDIT_CARD", "PIX_AUTOMATIC"]).optional(),
  installmentCount: z.number().int().min(1).max(12).optional(),
  couponCode: z.string().optional(),
  creditCardToken: z.string().optional(),
  customer: customerSchema
});

export async function POST(req: Request) {
  try {
    const body = bodySchema.parse(await req.json());

    const session = await auth();
    // Só reaproveita a sessão atual quando o e-mail do formulário é o mesmo da conta logada
    // (fluxo de upgrade in-app, ex.: /settings?tab=plan). E-mail diferente = checkout público
    // pra outra conta — mesmo com uma sessão (possivelmente de outra pessoa/teste) aberta no
    // navegador, não pode travar exigindo admin de um tenant que não tem nada a ver com a compra.
    const sessionMatchesFormEmail =
      !!session?.user?.email &&
      session.user.email.toLowerCase().trim() === body.customer.email.toLowerCase().trim();

    let tenantId: string;
    let userId: string;

    if (sessionMatchesFormEmail) {
      // tenantId/userId vêm da sessão autenticada (não do input do usuário), então não há
      // risco de impersonation aqui — qualquer membro pode fazer upgrade/pagar pelo próprio
      // workspace. Exigir role "admin" bloqueava o próprio fluxo de upgrade in-app descrito acima.
      const { tenant, user } = await getAppContext();
      tenantId = tenant.id;
      userId = user.id;
    } else {
      // Checkout público: cria conta+tenant na hora a partir do nome/e-mail do formulário
      // (sem tela de login separada). Se já existir uma conta de verdade com esse e-mail,
      // devolve ACCOUNT_EXISTS pro client pedir login em vez de criar por cima.
      const resolved = await resolveOrCreateAnonymousTenant(
        body.customer.name,
        body.customer.email
      );
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
      userId = resolved.userId;
    }

    const locale = body.locale ?? "pt-BR";
    const provider =
      body.provider ?? resolveCheckoutProvider(locale, body.paymentRegion ?? null);

    if (provider === "stripe") {
      const result = await startStripeCheckout({
        tenantId,
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
      tenantId,
      userId,
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
