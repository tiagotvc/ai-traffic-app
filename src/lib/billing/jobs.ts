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
  const saved = await billingJob.save(job);
  console.log(`[billing-jobs] enqueued id=${saved.id} type=${type} tenantId=${payload.tenantId ?? "?"}`);
  return saved;
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
      console.log(`[billing-jobs] done id=${job.id} type=${job.type}`);
    } catch (err) {
      job.attempts += 1;
      job.lastError = err instanceof Error ? err.message : String(err);
      if (job.attempts >= MAX_ATTEMPTS) {
        job.status = "failed";
        failed++;
        console.error(
          `[billing-jobs] FAILED PERMANENTLY id=${job.id} type=${job.type} attempts=${job.attempts}: ${job.lastError}`
        );
      } else {
        job.status = "pending";
        job.runAfter = new Date(Date.now() + job.attempts * 60_000);
        console.error(
          `[billing-jobs] retrying id=${job.id} type=${job.type} attempt=${job.attempts}/${MAX_ATTEMPTS}: ${job.lastError}`
        );
      }
    }
    await billingJob.save(job);
  }

  if (pending.length > 0) {
    console.log(
      `[billing-jobs] batch done processed=${processed} failed=${failed} total=${pending.length}`
    );
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
    processPaymentRefunded,
    processPaymentChargeback,
    processSubscriptionInactivated,
    processSubscriptionUpdated,
    processNfAuthorized,
    processNfError,
    processPixAuthActivated,
    processPixAuthCancelled,
    processPixAuthExpired,
    processPixAuthRefused,
    processDisputeClosed,
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
    case "payment_refunded":
      await processPaymentRefunded(job.payload);
      break;
    case "payment_chargeback":
      await processPaymentChargeback(job.payload);
      break;
    case "subscription_inactivated":
      await processSubscriptionInactivated(job.payload);
      break;
    case "subscription_updated":
      await processSubscriptionUpdated(job.payload);
      break;
    case "nf_authorized":
      await processNfAuthorized(job.payload);
      break;
    case "nf_error":
      await processNfError(job.payload);
      break;
    case "pix_auth_activated":
      await processPixAuthActivated(job.payload);
      break;
    case "pix_auth_cancelled":
      await processPixAuthCancelled(job.payload);
      break;
    case "pix_auth_expired":
      await processPixAuthExpired(job.payload);
      break;
    case "pix_auth_refused":
      await processPixAuthRefused(job.payload);
      break;
    case "payment_dispute_closed":
      await processDisputeClosed(job.payload);
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
