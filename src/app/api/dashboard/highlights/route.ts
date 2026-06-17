import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";

export async function GET(req: Request) {
  const { tenant } = await getAppContext();
  const url = new URL(req.url);
  const clientParam = url.searchParams.get("clientId")?.trim();

  const { clientActionSuggestion: suggestionRepo } = await repositories();

  let clientId: string | null = null;
  if (clientParam) {
    const client = await getClientBySlugOrId(tenant.id, clientParam);
    clientId = client?.id ?? null;
  }

  const pending = await suggestionRepo.count({
    where: {
      tenantId: tenant.id,
      status: "PENDING",
      ...(clientId ? { clientId } : {})
    }
  });

  return NextResponse.json({ ok: true, pendingSuggestions: pending });
}
