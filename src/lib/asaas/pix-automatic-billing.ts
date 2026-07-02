import "server-only";

import { repositories } from "@/db/repositories";
import { createAsaasPixAutomaticCharge } from "./pix-automatic";
import { isPastBusinessDayWindow, isWithinBusinessDayWindow } from "./business-days";

const MIN_BUSINESS_DAYS = 2;
const MAX_BUSINESS_DAYS = 10;

function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

export function addFrequency(dueDateStr: string, frequency: "MONTHLY" | "ANNUALLY"): string {
  const d = parseDateOnly(dueDateStr);
  if (frequency === "ANNUALLY") d.setUTCFullYear(d.getUTCFullYear() + 1);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * O "motor" de Pix Automático: diferente de Assinaturas (onde a Asaas gera a cobrança sozinha),
 * aqui a nossa aplicação é responsável por criar cada cobrança seguinte, sempre entre 2 e 10 dias
 * úteis antes do vencimento (regra do Bacen, imposta pela API da Asaas). Roda diariamente via
 * /api/cron/pix-automatic-billing — precisa rodar TODO dia porque a janela é calculada em dias
 * úteis, não numa data fixa do mês.
 */
export async function runPixAutomaticBillingCycle(): Promise<{
  checked: number;
  created: number;
  errors: number;
  missedWindow: number;
}> {
  const { pixAutomaticAuthorization: authRepo, invoice: invRepo, subscription: subRepo } =
    await repositories();
  const today = new Date();
  const active = await authRepo.find({ where: { status: "active" } });

  let created = 0;
  let errors = 0;
  let missedWindow = 0;

  for (const auth of active) {
    try {
      if (auth.lastInstructionCreatedForDueDate === auth.nextChargeDueDate) continue;
      if (auth.finishDate && auth.nextChargeDueDate >= auth.finishDate) continue;

      const dueDate = parseDateOnly(auth.nextChargeDueDate);

      if (isPastBusinessDayWindow(dueDate, today, MIN_BUSINESS_DAYS)) {
        // Perdemos a janela (ex: cron não rodou por N dias, ou frequência recém-alterada deixou a
        // data no passado). Não avançamos a data sozinhos aqui — isso esconderia o problema.
        // Fica visível no log pra investigação manual.
        missedWindow++;
        console.error(
          `[pix-automatic-billing] JANELA PERDIDA authorizationId=${auth.id} tenantId=${auth.tenantId} dueDate=${auth.nextChargeDueDate} — cobrança não criada a tempo, requer revisão manual`
        );
        continue;
      }

      if (!isWithinBusinessDayWindow(dueDate, today, MIN_BUSINESS_DAYS, MAX_BUSINESS_DAYS)) {
        continue; // ainda não chegou a janela — normal, tenta de novo amanhã
      }

      const charge = await createAsaasPixAutomaticCharge({
        authorizationId: auth.asaasAuthorizationId,
        customerId: auth.asaasCustomerId,
        valueCents: auth.valueCents,
        dueDate: auth.nextChargeDueDate,
        description: "Assinatura Orion Agency"
      });

      // Cria o Invoice local ANTES do webhook chegar — senão PAYMENT_RECEIVED não acha o invoice
      // (sem invoiceId resolvido, buildJobPayload não consegue casar planId corretamente).
      const sub = await subRepo.findOne({ where: { id: auth.subscriptionId } });
      await invRepo.save(
        invRepo.create({
          tenantId: auth.tenantId,
          subscriptionId: auth.subscriptionId,
          planId: sub?.planId ?? null,
          provider: "asaas",
          externalPaymentId: charge.id,
          amountCents: auth.valueCents,
          currency: "BRL",
          status: "pending",
          billingType: "PIX",
          billingCycle: auth.frequency === "ANNUALLY" ? "yearly" : "monthly",
          dueDate: auth.nextChargeDueDate,
          nfStatus: "pending",
          description: "Assinatura Orion Agency"
        })
      );

      const previousDueDate = auth.nextChargeDueDate;
      auth.lastInstructionCreatedForDueDate = previousDueDate;
      auth.lastInstructionCreatedAt = new Date();
      auth.nextChargeDueDate = addFrequency(previousDueDate, auth.frequency);
      await authRepo.save(auth);

      created++;
      console.log(
        `[pix-automatic-billing] cobrança criada authorizationId=${auth.id} tenantId=${auth.tenantId} dueDate=${previousDueDate} paymentId=${charge.id} próximaDueDate=${auth.nextChargeDueDate}`
      );
    } catch (err) {
      errors++;
      console.error(
        `[pix-automatic-billing] erro ao criar cobrança authorizationId=${auth.id} tenantId=${auth.tenantId}: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  console.log(
    `[pix-automatic-billing] ciclo concluído checked=${active.length} created=${created} errors=${errors} missedWindow=${missedWindow}`
  );

  return { checked: active.length, created, errors, missedWindow };
}
