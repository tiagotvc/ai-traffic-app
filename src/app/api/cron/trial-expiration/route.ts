import { NextResponse } from "next/server";

import { suspendExpiredTrials } from "@/lib/billing/event-handlers";

export const maxDuration = 30;

function authorizeCron(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

/** Cron dedicado: mantém a expiração do trial independente do restante do billing worker. */
export async function GET(req: Request) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const suspended = await suspendExpiredTrials();
    return NextResponse.json({ ok: true, suspended });
  } catch (err) {
    console.error("[trial-expiration] falha ao suspender trials vencidos:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export const POST = GET;
