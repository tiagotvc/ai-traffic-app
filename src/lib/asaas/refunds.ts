import { asaasFetch } from "./client";

export async function refundAsaasPayment(paymentId: string, valueCents?: number) {
  const body =
    valueCents != null ? JSON.stringify({ value: valueCents / 100 }) : undefined;
  return asaasFetch<{ id: string; status: string }>(`/payments/${paymentId}/refund`, {
    method: "POST",
    body
  });
}
