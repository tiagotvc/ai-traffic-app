import { asaasFetch } from "./client";

export type AsaasPayment = {
  id: string;
  customer: string;
  subscription?: string;
  value: number;
  netValue?: number;
  billingType: string;
  status: string;
  dueDate: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  transactionReceiptUrl?: string;
};

export type AsaasPixQr = {
  encodedImage: string;
  payload: string;
  expirationDate: string;
};

export async function createAsaasPayment(input: {
  customerId: string;
  billingType: "PIX" | "CREDIT_CARD" | "BOLETO";
  valueCents: number;
  dueDate: string;
  description: string;
  creditCardToken?: string;
  installmentCount?: number;
  remoteIp?: string;
  /** Vincula a cobrança a uma autorização de Pix Automático ACTIVE (ver pix-automatic.ts). */
  pixAutomaticAuthorizationId?: string;
}) {
  const body: Record<string, unknown> = {
    customer: input.customerId,
    billingType: input.billingType,
    dueDate: input.dueDate,
    description: input.description,
    creditCardToken: input.creditCardToken,
    remoteIp: input.remoteIp,
    pixAutomaticAuthorizationId: input.pixAutomaticAuthorizationId
  };

  const installments = input.installmentCount ?? 1;
  if (input.billingType === "CREDIT_CARD" && installments >= 2) {
    body.installmentCount = installments;
    body.totalValue = input.valueCents / 100;
  } else {
    body.value = input.valueCents / 100;
  }

  return asaasFetch<AsaasPayment>("/payments", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export async function getAsaasPayment(paymentId: string) {
  return asaasFetch<AsaasPayment>(`/payments/${paymentId}`);
}

export async function getAsaasPixQr(paymentId: string) {
  return asaasFetch<AsaasPixQr>(`/payments/${paymentId}/pixQrCode`);
}

export type AsaasCreditCardToken = {
  creditCardToken: string;
  creditCardNumber?: string;
  creditCardBrand?: string;
};

export async function tokenizeAsaasCreditCard(input: {
  customerId: string;
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
  holderEmail: string;
  holderCpfCnpj: string;
  holderPostalCode: string;
  holderAddressNumber: string;
  holderPhone: string;
  remoteIp?: string;
}) {
  return asaasFetch<AsaasCreditCardToken>("/creditCard/tokenizeCreditCard", {
    method: "POST",
    body: JSON.stringify({
      customer: input.customerId,
      creditCard: {
        holderName: input.holderName,
        number: input.number.replace(/\s/g, ""),
        expiryMonth: input.expiryMonth,
        expiryYear: input.expiryYear,
        ccv: input.ccv
      },
      creditCardHolderInfo: {
        name: input.holderName,
        email: input.holderEmail,
        cpfCnpj: input.holderCpfCnpj.replace(/\D/g, ""),
        postalCode: input.holderPostalCode.replace(/\D/g, ""),
        addressNumber: input.holderAddressNumber,
        phone: input.holderPhone.replace(/\D/g, "")
      },
      remoteIp: input.remoteIp
    })
  });
}

export async function listAsaasPaymentsBySubscription(subscriptionId: string) {
  return asaasFetch<{ data: AsaasPayment[] }>(
    `/payments?subscription=${encodeURIComponent(subscriptionId)}&limit=5`
  );
}
