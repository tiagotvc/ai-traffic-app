import "server-only";

import { repositories } from "@/db/repositories";
import { getBillingProvider } from "@/lib/billing/providers";
import { downgradeTenantForRefund } from "@/lib/billing/event-handlers";
import type { RefundRequest } from "@/db/entities/RefundRequest";

/**
 * Executa de fato o reembolso de uma `RefundRequest` pendente: chama o reembolso real no
 * provedor, marca a fatura como `refunded`, fecha a solicitação como `processed` e derruba
 * os acessos pagos do tenant (downgrade pro plano free) — o reembolso é o "sim, devolvemos o
 * dinheiro" definitivo, não faz sentido o tenant continuar com acesso pago depois disso.
 * Usado tanto pela aprovação manual (admin revisa um pedido feito pelo cliente) quanto pelo
 * atalho direto (admin inicia e já processa, no painel de assinaturas) — mesmo caminho,
 * mesmo rastro de auditoria, só muda quem aparece como `requestedByUserId`.
 */
export async function processRefundRequest(
  requestId: string,
  reviewerUserId: string | null,
  note?: string | null
): Promise<{ ok: true; refund: RefundRequest } | { ok: false; error: string }> {
  console.log(`[billing-refund] processRefundRequest iniciado — requestId=${requestId} reviewerUserId=${reviewerUserId ?? "-"}`);
  const { refundRequest: refRepo, invoice: invRepo } = await repositories();
  const row = await refRepo.findOne({ where: { id: requestId } });
  if (!row || row.status !== "pending") {
    console.warn(`[billing-refund] requestId=${requestId} não encontrado ou não está pending (status=${row?.status ?? "—"})`);
    return { ok: false, error: "Not found" };
  }
  const inv = await invRepo.findOne({ where: { id: row.invoiceId } });
  if (!inv?.externalPaymentId) {
    console.warn(`[billing-refund] requestId=${requestId} invoiceId=${row.invoiceId} sem externalPaymentId, abortando`);
    return { ok: false, error: "No payment id" };
  }

  const provider = getBillingProvider(row.provider);
  console.log(
    `[billing-refund] chamando refundPayment no provedor — requestId=${requestId} provider=${row.provider} tenantId=${row.tenantId} invoiceId=${inv.id} externalPaymentId=${inv.externalPaymentId} amountCents=${inv.amountCents}`
  );
  const result = await provider.refundPayment(inv.externalPaymentId);
  console.log(`[billing-refund] refundPayment respondeu — requestId=${requestId} externalRefundId=${result.id}`);

  inv.status = "refunded";
  await invRepo.save(inv);
  row.status = "processed";
  row.externalRefundId = result.id;
  row.reviewedByUserId = reviewerUserId;
  row.reviewedAt = new Date();
  row.reviewNote = note ?? null;
  await refRepo.save(row);
  console.log(`[billing-refund] RefundRequest marcada como processed — requestId=${requestId} externalRefundId=${result.id}`);

  await downgradeTenantForRefund(row.tenantId, {
    reason: "refund_request_processed",
    invoiceId: inv.id,
    requestId: row.id,
    externalRefundId: result.id
  });

  return { ok: true, refund: row };
}
