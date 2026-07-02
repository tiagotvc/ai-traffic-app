import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";

export const maxDuration = 60;

function authorizeCron(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

/** Backup reconciliation — marks stale pending invoices; full provider sync can be extended here. */
export async function POST(req: Request) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { invoice } = await repositories();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const stale = await invoice
    .createQueryBuilder("i")
    .where("i.status = :status", { status: "pending" })
    .andWhere("i.createdAt < :weekAgo", { weekAgo })
    .getMany();

  let canceled = 0;
  for (const inv of stale) {
    inv.status = "canceled";
    await invoice.save(inv);
    canceled++;
  }

  return NextResponse.json({ ok: true, staleCanceled: canceled });
}

/** Vercel Cron invokes via GET; keep POST for manual/internal triggering. */
export const GET = POST;
