import { NextResponse } from "next/server";

import { runPixAutomaticBillingCycle } from "@/lib/asaas/pix-automatic-billing";

export const maxDuration = 60;

function authorizeCron(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

/** Cria a próxima cobrança de cada autorização de Pix Automático ACTIVE que esteja na janela de
 * 2-10 dias úteis antes do vencimento. Precisa rodar diariamente — a janela é em dias úteis, não
 * numa data fixa do mês. Ver src/lib/asaas/pix-automatic-billing.ts. */
export async function POST(req: Request) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const result = await runPixAutomaticBillingCycle();
  return NextResponse.json({ ok: true, ...result });
}

/** Vercel Cron invoca via GET; mantém POST pra disparo manual/interno. */
export const GET = POST;
