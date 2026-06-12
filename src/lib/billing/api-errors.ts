import { NextResponse } from "next/server";

import { PlanLimitError, SubscriptionBlockedError } from "@/lib/billing/entitlements";

export function billingErrorResponse(err: unknown) {
  if (err instanceof PlanLimitError) {
    return NextResponse.json(
      { ok: false, code: err.code, limitKey: err.limitKey, error: err.message },
      { status: 402 }
    );
  }
  if (err instanceof SubscriptionBlockedError) {
    return NextResponse.json(
      { ok: false, code: err.code, status: err.status, error: err.message },
      { status: 402 }
    );
  }
  return null;
}
