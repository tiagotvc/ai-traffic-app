import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { requireBillingAdmin } from "@/lib/billing/admin-auth";
import { processRefundRequest } from "@/lib/billing/refund-service";

const bodySchema = z.object({
  reason: z.string().max(500).optional()
});

/**
 * Atalho do painel de assinaturas: admin pede o reembolso da última fatura paga desta
 * assinatura e já processa na hora — mesmo caminho (`RefundRequest` + `processRefundRequest`)
 * que o pedido feito pelo próprio cliente, só que `requestedByUserId` e `reviewedByUserId`
 * são o mesmo admin (não há um segundo aprovador quando é o admin quem inicia).
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireBillingAdmin();
  if (!gate.ok) return gate.response;
  const { id: subscriptionId } = await params;

  try {
    const body = bodySchema.parse(await req.json().catch(() => ({})));
    const {
      subscription: subRepo,
      invoice: invRepo,
      refundRequest: refRepo,
      user: userRepo
    } = await repositories();

    const sub = await subRepo.findOne({ where: { id: subscriptionId } });
    if (!sub) {
      return NextResponse.json({ ok: false, error: "Subscription not found" }, { status: 404 });
    }

    // requirePlatformAdmin devolve userId direto da sessão quando disponível; no caso raro de
    // um e-mail listado como admin de billing sem sessão com id (ex.: token antigo), resolve
    // pelo e-mail — nunca deixamos requestedByUserId vazio/errado.
    const adminUserId = gate.userId ?? (await userRepo.findOne({ where: { email: gate.email.toLowerCase() } }))?.id;
    if (!adminUserId) {
      return NextResponse.json({ ok: false, error: "Admin user not found" }, { status: 400 });
    }

    // Invoice.subscriptionId nunca é preenchido em nenhum lugar do código — filtra por
    // tenantId (sempre populado) em vez disso. Subscription.tenantId é único (uma assinatura
    // ativa por tenant), então "última fatura paga do tenant" já identifica a certa.
    const inv = await invRepo.findOne({
      where: { tenantId: sub.tenantId, status: "paid" },
      order: { paidAt: "DESC" }
    });
    if (!inv?.externalPaymentId) {
      return NextResponse.json(
        { ok: false, error: "Nenhuma fatura paga encontrada para reembolsar" },
        { status: 400 }
      );
    }

    const existing = await refRepo.findOne({ where: { invoiceId: inv.id, status: "pending" } });
    if (existing) {
      return NextResponse.json({ ok: false, error: "Já existe um reembolso pendente para esta fatura" }, { status: 409 });
    }

    const row = await refRepo.save(
      refRepo.create({
        tenantId: sub.tenantId,
        invoiceId: inv.id,
        requestedByUserId: adminUserId,
        provider: inv.provider,
        reason: body.reason ?? "Reembolso solicitado pelo admin via painel de assinaturas",
        status: "pending"
      })
    );

    const result = await processRefundRequest(row.id, adminUserId, body.reason ?? null);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, refund: result.refund });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error" },
      { status: 400 }
    );
  }
}
