import "server-only";

import { asaasFetch } from "./client";

export type InstallmentSimulateRow = {
  installmentCount: number;
  paymentValueCents: number;
  feePercentage: number;
  feeValueCents: number;
  totalCents: number;
};

type SimulateCreditCardRow = {
  feePercentage?: number;
  feeValue?: number;
  installment?: {
    paymentValue?: number;
    installmentCount?: number;
  };
};

type SimulateResponse = {
  creditCard?: SimulateCreditCardRow | SimulateCreditCardRow[];
};

export async function simulateAsaasCreditCardInstallment(input: {
  valueCents: number;
  installmentCount: number;
}): Promise<InstallmentSimulateRow> {
  const body = await asaasFetch<SimulateResponse>("/finance/payment/simulate", {
    method: "POST",
    body: JSON.stringify({
      value: input.valueCents / 100,
      installmentCount: input.installmentCount,
      billingTypes: ["CREDIT_CARD"]
    })
  });

  const row = Array.isArray(body.creditCard) ? body.creditCard[0] : body.creditCard;
  const paymentValue = row?.installment?.paymentValue ?? input.valueCents / 100 / input.installmentCount;
  const feeValue = row?.feeValue ?? 0;
  const feePct = row?.feePercentage ?? 0;
  const totalReais = paymentValue * input.installmentCount;

  return {
    installmentCount: input.installmentCount,
    paymentValueCents: Math.round(paymentValue * 100),
    feePercentage: feePct,
    feeValueCents: Math.round(feeValue * 100),
    totalCents: Math.round(totalReais * 100)
  };
}

export async function simulateAllInstallmentOptions(valueCents: number, counts: number[]) {
  const results: InstallmentSimulateRow[] = [];
  for (const count of counts) {
    try {
      results.push(await simulateAsaasCreditCardInstallment({ valueCents, installmentCount: count }));
    } catch {
      const paymentValueCents = Math.round(valueCents / count);
      results.push({
        installmentCount: count,
        paymentValueCents,
        feePercentage: 0,
        feeValueCents: 0,
        totalCents: valueCents
      });
    }
  }
  return results;
}
