import { NextResponse } from "next/server";

import { isAsaasConfigured } from "@/lib/asaas/client";

export async function GET() {
  return NextResponse.json({
    ok: true,
    asaasConfigured: isAsaasConfigured()
  });
}
