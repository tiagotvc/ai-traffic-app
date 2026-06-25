import { asaasFetch, getAsaasConfig } from "./client";

export type AsaasInvoice = {
  id: string;
  status: string;
  number?: string;
  pdfUrl?: string;
};

export async function emitAsaasNotaFiscal(input: {
  paymentId: string;
  serviceDescription: string;
  valueCents: number;
  customerName: string;
  customerCpfCnpj: string;
}) {
  const { nfServiceCode } = getAsaasConfig();
  return asaasFetch<AsaasInvoice>("/invoices", {
    method: "POST",
    body: JSON.stringify({
      payment: input.paymentId,
      serviceDescription: input.serviceDescription,
      observations: `Assinatura Orion Agency — ${input.customerName}`,
      value: input.valueCents / 100,
      municipalServiceCode: nfServiceCode || undefined,
      customer: {
        cpfCnpj: input.customerCpfCnpj.replace(/\D/g, "")
      }
    })
  });
}

export async function getAsaasNotaFiscal(invoiceId: string) {
  return asaasFetch<AsaasInvoice>(`/invoices/${invoiceId}`);
}

export async function authorizeAsaasNotaFiscal(invoiceId: string) {
  return asaasFetch<AsaasInvoice>(`/invoices/${invoiceId}/authorize`, {
    method: "POST"
  });
}
