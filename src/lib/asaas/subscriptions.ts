import { asaasFetch } from "./client";

export type AsaasSubscription = {
  id: string;
  customer: string;
  billingType: string;
  value: number;
  nextDueDate: string;
  status: string;
};

export async function createAsaasSubscription(input: {
  customerId: string;
  billingType: "PIX" | "CREDIT_CARD" | "BOLETO";
  valueCents: number;
  cycle: "MONTHLY" | "YEARLY";
  description: string;
  creditCardToken?: string;
  nextDueDate?: string;
  remoteIp?: string;
}) {
  return asaasFetch<AsaasSubscription>("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      customer: input.customerId,
      billingType: input.billingType,
      value: input.valueCents / 100,
      cycle: input.cycle,
      description: input.description,
      nextDueDate: input.nextDueDate ?? new Date().toISOString().slice(0, 10),
      creditCardToken: input.creditCardToken,
      remoteIp: input.remoteIp
    })
  });
}

export async function cancelAsaasSubscription(subscriptionId: string) {
  return asaasFetch<AsaasSubscription>(`/subscriptions/${subscriptionId}`, {
    method: "DELETE"
  });
}

export async function getAsaasSubscription(subscriptionId: string) {
  return asaasFetch<AsaasSubscription>(`/subscriptions/${subscriptionId}`);
}
