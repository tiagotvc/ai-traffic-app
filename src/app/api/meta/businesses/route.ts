import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { listTenantBusinessesWithCounts, listTenantInventory } from "@/lib/meta-discover";
import { fetchMyBusinesses } from "@/lib/meta-graph";

type BusinessRow = {
  metaBusinessId: string;
  name: string;
  adAccountCount: number;
  pageCount: number;
};

export async function GET() {
  const { tenant, metaAccessToken } = await getAppContext();

  // Contagens do que já está no inventário (quando houver sync prévia).
  const dbRows = await listTenantBusinessesWithCounts(tenant.id);
  const countById = new Map(dbRows.map((r) => [r.metaBusinessId, r]));

  // Lista de BMs ao vivo (1 chamada rápida) — sempre disponível para o wizard,
  // mesmo sem a sincronização pesada. Os ativos de cada BM são puxados sob demanda.
  let live: Array<{ id: string; name?: string }> = [];
  if (metaAccessToken) {
    try {
      live = await fetchMyBusinesses(metaAccessToken);
    } catch {
      live = [];
    }
  }

  const merged = new Map<string, BusinessRow>();
  for (const b of live) {
    const c = countById.get(b.id);
    merged.set(b.id, {
      metaBusinessId: b.id,
      name: b.name ?? c?.name ?? b.id,
      adAccountCount: c?.adAccountCount ?? 0,
      pageCount: c?.pageCount ?? 0
    });
  }
  // Inclui BMs já persistidos que não vieram no live (ex.: "unassigned" / inferidos).
  for (const r of dbRows) {
    if (!merged.has(r.metaBusinessId)) {
      merged.set(r.metaBusinessId, {
        metaBusinessId: r.metaBusinessId,
        name: r.name,
        adAccountCount: r.adAccountCount,
        pageCount: r.pageCount
      });
    }
  }

  const businesses = [...merged.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );

  const inventoryCount = (await listTenantInventory(tenant.id)).length;

  return NextResponse.json({
    ok: true,
    businesses,
    totals: {
      businesses: businesses.filter((b) => b.metaBusinessId !== "unassigned").length,
      adAccounts: inventoryCount,
      pages: dbRows.reduce((s, r) => s + r.pageCount, 0)
    }
  });
}
