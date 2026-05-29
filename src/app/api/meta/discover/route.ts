import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { runMetaDiscover } from "@/lib/meta-discover";

export async function POST() {
  const { tenant, metaAccessToken } = await getAppContext();
  if (!metaAccessToken) {
    return NextResponse.json(
      { ok: false, error: "Meta não conectada. Entre com Facebook ou reconecte em Configurações." },
      { status: 400 }
    );
  }

  try {
    const result = await runMetaDiscover(tenant.id, metaAccessToken);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Falha ao descobrir ativos Meta";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
