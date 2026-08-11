import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { listAccountImages, validateClientAdAccount } from "@/lib/creative-studio/account-images";

export async function GET(req: Request) {
  try {
    const { tenant, metaAccessToken } = await getAppContext();
    const url = new URL(req.url);
    const clientId = url.searchParams.get("clientId")?.trim();
    const adAccountId = url.searchParams.get("adAccountId")?.trim();

    if (!clientId || !adAccountId) {
      return NextResponse.json({ ok: false, error: "clientId e adAccountId são obrigatórios" }, { status: 400 });
    }
    if (!metaAccessToken) {
      return NextResponse.json({ ok: false, error: "Meta não conectado" }, { status: 400 });
    }

    const validation = await validateClientAdAccount(tenant.id, clientId, adAccountId);
    if (!validation.ok) {
      return NextResponse.json({ ok: false, error: validation.error }, { status: validation.status });
    }

    const images = await listAccountImages(metaAccessToken, adAccountId);
    return NextResponse.json({ ok: true, images });
  } catch {
    return NextResponse.json({ ok: false, error: "Não foi possível carregar os criativos da conta agora" }, { status: 500 });
  }
}
