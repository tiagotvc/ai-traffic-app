import "server-only";

import { LessThanOrEqual } from "typeorm";
import { repositories } from "@/db/repositories";
import type { BillingJob } from "@/db/entities/BillingJob";

const MAX_ATTEMPTS = 5;

export async function enqueueBillingJob(
  type: string,
  payload: Record<string, unknown>,
  runAfter = new Date()
) {
  const { billingJob } = await repositories();
  const job = billingJob.create({ type, payload, status: "pending", runAfter, attempts: 0 });
  return billingJob.save(job);
}

export async function processBillingJobs(limit = 50): Promise<{ processed: number; failed: number }> {
  const { billingJob } = await repositories();
  const now = new Date();
  const pending = await billingJob.find({
    where: { status: "pending", runAfter: LessThanOrEqual(now) },
    order: { runAfter: "ASC" },
    take: limit
  });

  let processed = 0;
  let failed = 0;

  for (const job of pending) {
    job.status = "processing";
    await billingJob.save(job);
    try {
      await dispatchBillingJob(job);
      job.status = "done";
      job.processedAt = new Date();
      job.lastError = null;
      processed++;
    } catch (err) {
      job.attempts += 1;
      job.lastError = err instanceof Error ? err.message : String(err);
      if (job.attempts >= MAX_ATTEMPTS) {
        job.status = "failed";
        failed++;
      } else {
        job.status = "pending";
        job.runAfter = new Date(Date.now() + job.attempts * 60_000);
      }
    }
    await billingJob.save(job);
  }

  return { processed, failed };
}

async function dispatchBillingJob(job: BillingJob) {
  const {
    processPaymentCreated,
    processPaymentConfirmed,
    processPaymentReceived,
    processPaymentOverdue,
    processSubscriptionCanceled,
    emitNotaFiscal
  } = await import("@/lib/billing/event-handlers");

  switch (job.type) {
    case "payment_created":
      await processPaymentCreated(job.payload);
      break;
    case "payment_confirmed":
      await processPaymentConfirmed(job.payload);
      break;
    case "payment_received":
    case "process_payment":
      await processPaymentReceived(job.payload);
      break;
    case "payment_overdue":
      await processPaymentOverdue(job.payload);
      break;
    case "subscription_canceled":
      await processSubscriptionCanceled(job.payload);
      break;
    case "emit_nf":
      await emitNotaFiscal(job.payload);
      break;
    default:
      throw new Error(`Unknown billing job type: ${job.type}`);
  }
}

export async function recordBillingEvent(input: {
  provider: string;
  eventType: string;
  idempotencyKey: string;
  tenantId?: string;
  payload?: Record<string, unknown>;
}) {
  const { billingEvent } = await repositories();
  const existing = await billingEvent.findOne({
    where: { idempotencyKey: input.idempotencyKey }
  });
  if (existing) return { event: existing, isNew: false };

  const event = billingEvent.create({
    provider: input.provider,
    eventType: input.eventType,
    idempotencyKey: input.idempotencyKey,
    tenantId: input.tenantId,
    payload: input.payload
  });
  await billingEvent.save(event);
  return { event, isNew: true };
}
