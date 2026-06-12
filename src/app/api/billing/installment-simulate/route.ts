import { NextResponse } from "next/server";

import { simulateAllInstallmentOptions } from "@/lib/asaas/simulate";

const INSTALLMENT_OPTIONS = [2, 3, 6, 12];

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const valueCents = Number(url.searchParams.get("valueCents"));
    if (!Number.isFinite(valueCents) || valueCents <= 0) {
      return NextResponse.json({ ok: false, error: "Invalid valueCents" }, { status: 400 });
    }

    const options = await simulateAllInstallmentOptions(valueCents, INSTALLMENT_OPTIONS);
    return NextResponse.json({ ok: true, options });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Simulation failed" },
      { status: 400 }
    );
  }
}
