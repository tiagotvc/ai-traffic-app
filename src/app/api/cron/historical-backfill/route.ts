import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { enqueueHistoricalBackfill } from "@/lib/historical-backfill";
import { getTenantMetaAccessToken } from "@/lib/meta-auth-store";

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

  const { tenant: tenantRepo } = await repositories();
  const tenants = await tenantRepo.find();

  let enqueued = 0;
  for (const tenant of tenants) {
    const token = await getTenantMetaAccessToken(tenant.id);
    if (!token) continue;

    try {
      const res = await enqueueHistoricalBackfill({
        tenantId: tenant.id,
        metaAccessToken: token,
        depthDays: 90,
        triggeredByUserId: undefined
      });
      if (res.ok && !res.skipped) enqueued++;
    } catch {
      // continue
    }
  }

  return NextResponse.json({ ok: true, enqueued });
}

/** Vercel Cron invokes via GET; keep POST for manual/internal triggering. */
export const GET = POST;

