import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { clearMetaAuth, isMetaTokenInvalidError } from "@/lib/meta-auth-store";
import { runMetaDiscover } from "@/lib/meta-discover";

// Descoberta percorre muitos BMs/contas — dá folga ao tempo de execução no Vercel.
export const maxDuration = 60;

export async function POST() {
  const { tenant, user, metaAccessToken } = await getAppContext();
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
    if (isMetaTokenInvalidError(msg)) {
      await clearMetaAuth(user.id);
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
