import { NextResponse } from "next/server";
import { MoreThanOrEqual } from "typeorm";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";

type Bucket = { total: number; critical: number; warning: number };

function emptyBucket(): Bucket {
  return { total: 0, critical: 0, warning: 0 };
}

export async function GET(req: Request) {
  const { tenant } = await getAppContext();
  const daysRaw = Number(new URL(req.url).searchParams.get("days") ?? "30");
  const days = Math.min(90, Math.max(1, Number.isFinite(daysRaw) ? Math.floor(daysRaw) : 30));

  const { alert: alertRepo } = await repositories();

  const now = Date.now();
  const curStart = now - days * 86_400_000;
  const prevStart = now - 2 * days * 86_400_000;

  // Volume histórico: conta todos os alertas criados (inclusive dispensados).
  const rows = await alertRepo.find({
    where: { tenantId: tenant.id, createdAt: MoreThanOrEqual(new Date(prevStart)) }
  });

  const current = emptyBucket();
  const previous = emptyBucket();

  for (const r of rows) {
    const ts = r.createdAt.getTime();
    const bucket = ts >= curStart ? current : ts >= prevStart ? previous : null;
    if (!bucket) continue;
    bucket.total += 1;
    if (r.severity === "critical") bucket.critical += 1;
    else if (r.severity === "warning") bucket.warning += 1;
  }

  return NextResponse.json({ ok: true, days, current, previous });
}
