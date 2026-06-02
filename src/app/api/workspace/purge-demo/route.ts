import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { purgeDemoDataForTenant } from "@/lib/demo-data";

export async function POST() {
  try {
    const { tenant } = await getAppContext();
    const result = await purgeDemoDataForTenant(tenant.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao remover dados demo";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
