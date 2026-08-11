import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { fetchAccountImageAsBase64, validateClientAdAccount } from "@/lib/creative-studio/account-images";
import { assertFeatureEnabled, FeatureDisabledError } from "@/lib/feature-flags/service";

export async function GET(req: Request) {
  try {
    const { tenant, metaAccessToken } = await getAppContext();
    await assertFeatureEnabled("creative-studio");
    const url = new URL(req.url);
    const clientId = url.searchParams.get("clientId")?.trim();
    const adAccountId = url.searchParams.get("adAccountId")?.trim();
    const hash = url.searchParams.get("hash")?.trim();

    if (!clientId || !adAccountId || !hash) {
      return NextResponse.json({ ok: false, error: "clientId, adAccountId e hash são obrigatórios" }, { status: 400 });
    }
    if (!metaAccessToken) {
      return NextResponse.json({ ok: false, error: "Meta não conectado" }, { status: 400 });
    }

    const validation = await validateClientAdAccount(tenant.id, clientId, adAccountId);
    if (!validation.ok) {
      return NextResponse.json({ ok: false, error: validation.error }, { status: validation.status });
    }

    const result = await fetchAccountImageAsBase64(metaAccessToken, adAccountId, hash);
    if (!result) {
      return NextResponse.json({ ok: false, error: "Imagem não encontrada nessa conta" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof FeatureDisabledError) {
      return NextResponse.json({ ok: false, error: "Recurso desabilitado" }, { status: 403 });
    }
    return NextResponse.json({ ok: false, error: "Não foi possível baixar a imagem agora" }, { status: 500 });
  }
}
