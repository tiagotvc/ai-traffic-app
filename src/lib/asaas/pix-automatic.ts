import { asaasFetch } from "./client";
import { createAsaasPayment, type AsaasPayment } from "./payments";

/**
 * Pix Automático (docs.asaas.com/reference/criar-uma-autorizacao-pix-automatico). Diferente de
 * Assinaturas: aqui a Asaas só guarda a autorização de recorrência — QUEM cria cada cobrança
 * seguinte é a nossa aplicação (ver pix-automatic-billing cron), sempre 2-10 dias úteis antes do
 * vencimento.
 *
 * Formato CONFIRMADO contra o sandbox real (2026-07-01, não é mais best-effort): `payload` e
 * `encodedImage` do QR ficam no nível raiz da resposta (não aninhados em `qrCode` como a doc
 * pública sugeria); `expirationDate`/`conciliationIdentifier` ficam dentro de `immediateQrCode`;
 * o campo do cliente é `customerId`, não `customer`; status inicial observado é `CREATED`. O
 * pagamento imediato NÃO vira um objeto Payment separado consultável via `/payments?customer=` —
 * só existe como QR nesta própria resposta até ser pago.
 */
export type AsaasPixAutomaticAuthorization = {
  id: string;
  customerId: string;
  contractId: string;
  status: "CREATED" | "PENDING" | "ACTIVE" | "CANCELLED" | "EXPIRED" | "REFUSED" | string;
  frequency: "WEEKLY" | "MONTHLY" | "QUARTERLY" | "SEMIANNUALLY" | "ANNUALLY";
  value?: number;
  startDate: string;
  finishDate?: string | null;
  /** Copia-e-cola do QR (nível raiz). */
  payload?: string;
  /** Imagem do QR em base64 (nível raiz). */
  encodedImage?: string;
  immediateQrCode?: { conciliationIdentifier?: string; expirationDate?: string };
};

export async function createAsaasPixAutomaticAuthorization(input: {
  customerId: string;
  contractId: string;
  frequency: "MONTHLY" | "ANNUALLY";
  startDate: string;
  valueCents: number;
  description?: string;
  finishDate?: string;
}) {
  return asaasFetch<AsaasPixAutomaticAuthorization>("/pix/automatic/authorizations", {
    method: "POST",
    body: JSON.stringify({
      customerId: input.customerId,
      contractId: input.contractId,
      frequency: input.frequency,
      startDate: input.startDate,
      value: input.valueCents / 100,
      // Limite real da Asaas: description ≤ 35 chars (rejeita, não trunca sozinha).
      description: input.description?.slice(0, 35),
      finishDate: input.finishDate,
      // Descoberto testando contra o sandbox real: expirationSeconds e originalValue são
      // obrigatórios dentro de immediateQrCode (a doc pública só documentava minLimitValue como
      // opcional). originalValue = valor da 1ª cobrança (igual ao valor recorrente aqui).
      immediateQrCode: { expirationSeconds: 3600, originalValue: input.valueCents / 100 }
    })
  });
}

export async function cancelAsaasPixAutomaticAuthorization(authorizationId: string) {
  return asaasFetch<{ id: string; status: string }>(
    `/pix/automatic/authorizations/${authorizationId}`,
    { method: "DELETE" }
  );
}

export async function getAsaasPixAutomaticAuthorization(authorizationId: string) {
  return asaasFetch<AsaasPixAutomaticAuthorization>(
    `/pix/automatic/authorizations/${authorizationId}`
  );
}

/** Cria a próxima cobrança recorrente vinculada a uma autorização já ACTIVE. Deve rodar dentro da
 * janela de 2-10 dias úteis antes de `dueDate` — fora disso a Asaas rejeita (ver business-days.ts). */
export async function createAsaasPixAutomaticCharge(input: {
  authorizationId: string;
  customerId: string;
  valueCents: number;
  dueDate: string;
  description: string;
}): Promise<AsaasPayment> {
  return createAsaasPayment({
    customerId: input.customerId,
    billingType: "PIX",
    valueCents: input.valueCents,
    dueDate: input.dueDate,
    description: input.description,
    pixAutomaticAuthorizationId: input.authorizationId
  });
}
