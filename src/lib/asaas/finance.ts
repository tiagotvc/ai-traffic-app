import { asaasFetch, isAsaasConfigured } from "./client";

type AsaasBalance = {
  balance?: number;
};

export async function getAsaasFinanceBalance() {
  if (!isAsaasConfigured()) return null;
  try {
    const data = await asaasFetch<AsaasBalance>("/finance/balance");
    const balance = typeof data.balance === "number" ? data.balance : 0;
    return {
      availableCents: Math.round(balance * 100),
      currency: "BRL"
    };
  } catch {
    return null;
  }
}
