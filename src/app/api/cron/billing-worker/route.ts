import { NextResponse } from "next/server";

import { processBillingJobs } from "@/lib/billing/jobs";
import {
  backfillRecentTrialStartedEmails,
  processExpiredSubscriptionPeriods,
  suspendExpiredTrials,
  suspendOverdueSubscriptions
} from "@/lib/billing/event-handlers";

export const maxDuration = 60;

function authorizeCron(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

type CronStepResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

async function runCronStep<T>(name: string, task: () => Promise<T>): Promise<CronStepResult<T>> {
  try {
    return { ok: true, value: await task() };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[billing-worker] etapa ${name} falhou:`, err);
    return { ok: false, error };
  }
}

export async function POST(req: Request) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  // Regra crítica primeiro: uma falha em e-mail, CRM ou cobrança não pode prolongar trial.
  const expiredTrials = await runCronStep("expired-trials", () => suspendExpiredTrials());
  const expired = await runCronStep("expired-subscription-periods", () =>
    processExpiredSubscriptionPeriods()
  );
  const suspended = await runCronStep("overdue-and-reminders", () =>
    suspendOverdueSubscriptions()
  );
  const jobs = await runCronStep("billing-jobs", () => processBillingJobs(50));
  const trialStartedBackfill = await runCronStep("trial-started-backfill", () =>
    backfillRecentTrialStartedEmails(7)
  );

  const steps = { expiredTrials, expired, suspended, jobs, trialStartedBackfill };
  const ok = Object.values(steps).every((step) => step.ok);
  return NextResponse.json({ ok, ...steps }, { status: ok ? 200 : 500 });
}

/** Vercel Cron invokes via GET; keep POST for manual/internal triggering. */
export const GET = POST;
