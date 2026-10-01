import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { validateClientAdAccount } from "@/lib/audience-api-helpers";
import { fetchAllAccountAudiences, isLookalikeAudience } from "@/lib/audiences/bulk/execute.server";
import { formatMetaGraphError } from "@/lib/meta-error";

export const maxDuration = 30;

/**
 * Públicos-base disponíveis para Lookalike. Paginado de propósito: a lista do
 * hub para nos 100 primeiros, e contas que usam criação em lote passam disso.
 */
export async function GET(req: Request) {
  const { tenant, metaAccessToken } = await getAppContext();
  if (!metaAccessToken) {
    return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
  }
  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId")?.trim() ?? "";
  const adAccountId = url.searchParams.get("adAccountId")?.trim() ?? "";
  const validation = await validateClientAdAccount(tenant.id, clientId, adAccountId);
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: validation.status });
  }

  try {
    const audiences = (await fetchAllAccountAudiences(metaAccessToken, adAccountId))
      .filter((a) => !isLookalikeAudience(a))
      .map(({ id, name, approximateCount }) => ({ id, name, approximateCount }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    return NextResponse.json({ ok: true, audiences });
  } catch (e) {
    return NextResponse.json({ ok: false, error: formatMetaGraphError(e) }, { status: 502 });
  }
}
