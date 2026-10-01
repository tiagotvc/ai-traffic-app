import { NextResponse } from "next/server";

import { listAppsumoLicenses } from "@/lib/billing/appsumo/licensing-api";
import { reconcileAppsumoLicense } from "@/lib/billing/appsumo/webhook-handler";

export const maxDuration = 60;

function authorizeCron(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

const PAGE_LIMIT = 100;
const MAX_PAGES = 50; // safety cap (5k licenses); logs a warning if AppSumo has more

/**
 * Monthly safety net against missed webhook deliveries — walks every license AppSumo reports
 * via the Licensing API and corrects any row whose local status has drifted from theirs.
 */
export async function POST(req: Request) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.APPSUMO_API_KEY?.trim()) {
    return NextResponse.json({ ok: true, skipped: "APPSUMO_API_KEY not configured" });
  }

  let page = 1;
  let checked = 0;
  let changed = 0;

  while (page <= MAX_PAGES) {
    const { results } = await listAppsumoLicenses({ page, limit: PAGE_LIMIT });
    if (!results.length) break;

    for (const license of results) {
      checked++;
      const { changed: wasChanged } = await reconcileAppsumoLicense(license.license_key, {
        status: license.status,
        tier: license.tier
      });
      if (wasChanged) changed++;
    }

    if (results.length < PAGE_LIMIT) break;
    page++;
  }

  if (page > MAX_PAGES) {
    console.warn(`[cron/appsumo-reconcile] hit MAX_PAGES=${MAX_PAGES}, more licenses may remain`);
  }

  return NextResponse.json({ ok: true, checked, changed });
}

/** Vercel Cron invokes via GET; keep POST for manual/internal triggering. */
export const GET = POST;
