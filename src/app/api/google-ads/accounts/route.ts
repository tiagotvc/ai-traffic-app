import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { getStoredGoogleAccessToken } from "@/lib/google-auth-store";
import { listAccessibleCustomerGroups } from "@/lib/google-ads-api";
import { isGoogleAdsConfigured, isGoogleAdsEnabled } from "@/lib/google-env";

/** Lista as contas Google Ads acessíveis pela conexão do usuário atual (picker de conta). */
export async function GET() {
  if (!isGoogleAdsEnabled()) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  if (!isGoogleAdsConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Google Ads não configurado" },
      { status: 503 }
    );
  }

  let userId: string;
  try {
    const ctx = await getAppContext();
    userId = ctx.user.id;
  } catch {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = await getStoredGoogleAccessToken(userId);
  if (!accessToken) {
    return NextResponse.json({ ok: false, error: "not_connected" }, { status: 409 });
  }

  try {
    const managers = await listAccessibleCustomerGroups(accessToken);
    const accounts = managers.flatMap((manager) =>
      manager.accounts.map((account) => ({
        ...account,
        managerId: manager.id,
        loginCustomerId: manager.id === "direct" ? account.id : manager.id
      }))
    );
    return NextResponse.json({ ok: true, managers, accounts });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao listar contas";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
