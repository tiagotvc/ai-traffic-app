import { NextResponse } from "next/server";

import { processBillingJobs } from "@/lib/billing/jobs";
import {
  processExpiredSubscriptionPeriods,
  suspendOverdueSubscriptions
} from "@/lib/billing/event-handlers";

export const maxDuration = 60;

function authorizeCron(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const jobs = await processBillingJobs(50);
  const expired = await processExpiredSubscriptionPeriods();
  const suspended = await suspendOverdueSubscriptions();
  return NextResponse.json({ ok: true, jobs, expired, suspended });
}

/** Vercel Cron invokes via GET; keep POST for manual/internal triggering. */
export const GET = POST;
