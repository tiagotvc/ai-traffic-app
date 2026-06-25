import { NextResponse } from "next/server";

import { getClientBySlugOrId, listClientsForTenant } from "@/lib/app-context";
import type { TableBlockConfig } from "@/lib/dashboard/app-block-config";
import {
  metricsRequiredForColumns,
  normalizeTableColumnDefs,
  resolveSortColumnId
} from "@/lib/dashboard/table-column-config";
import { buildClientListCards } from "@/lib/clients-list";
import { resolveDashboardScope } from "@/lib/dashboard-query";
import type { MetricKey } from "@/lib/dashboard-metrics";
import { parsePeriodFromSearchParams } from "@/lib/report-period";
import {
  enforceViewClientScope,
  resolveDashboardDataAuth
} from "@/lib/dashboard/view-data-auth";

export async function GET(req: Request) {
  try {
    const auth = await resolveDashboardDataAuth(req);
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    }

    const url = new URL(req.url);
    const blockPeriod = url.searchParams.get("period")?.trim();
    if (blockPeriod) {
      url.searchParams.set("period", blockPeriod);
    }
    const period = parsePeriodFromSearchParams(url);
    let clientSlug = url.searchParams.get("clientId")?.trim() ?? "";
    try {
      clientSlug = enforceViewClientScope(auth.viewAccess, clientSlug) ?? "";
    } catch {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    const accountId = url.searchParams.get("accountId")?.trim() ?? "";
    const search = url.searchParams.get("search")?.trim().toLowerCase() ?? "";
    const presetFilter = url.searchParams.get("preset")?.trim() ?? "";

    const entity = url.searchParams.get("entity") ?? "clients";
    if (entity !== "clients") {
      return NextResponse.json({ ok: false, error: "Entity not supported yet" }, { status: 400 });
    }

    let config: Partial<TableBlockConfig> = {};
    const configRaw = url.searchParams.get("config");
    if (configRaw) {
      try {
        config = JSON.parse(decodeURIComponent(configRaw)) as Partial<TableBlockConfig>;
      } catch {
        config = {};
      }
    }

    const columns = metricsRequiredForColumns(normalizeTableColumnDefs(config));
    const sortColumnId = resolveSortColumnId(config);
    const sortColumn = sortColumnId === "name" ? "name" : sortColumnId;
    const sortDir = config.sortDirection ?? "desc";
    const topN = config.topN ?? 25;
    const sortEnabled = config.sortEnabled !== false;

    let clients = await listClientsForTenant(auth.tenantId);
    if (clientSlug) {
      const matched = await getClientBySlugOrId(auth.tenantId, clientSlug);
      clients = matched ? [matched] : [];
    } else if (accountId) {
      const scope = await resolveDashboardScope(auth.tenantId, null, accountId);
      const clientIds = new Set(scope.adAccounts.map((a) => a.clientId));
      clients = clients.filter((c) => clientIds.has(c.id));
    }

    let cards = await buildClientListCards(auth.tenantId, clients, period);

    if (search) {
      cards = cards.filter((c) => c.name.toLowerCase().includes(search));
    }
    if (presetFilter) {
      cards = cards.filter((c) => c.dominantPreset === presetFilter);
    }

    const sorted = sortEnabled
      ? [...cards].sort((a, b) => {
          if (sortColumn === "name") {
            return sortDir === "asc"
              ? a.name.localeCompare(b.name)
              : b.name.localeCompare(a.name);
          }
          const av = a.metrics?.[sortColumn as MetricKey] ?? a.roas ?? 0;
          const bv = b.metrics?.[sortColumn as MetricKey] ?? b.roas ?? 0;
          return sortDir === "asc" ? av - bv : bv - av;
        })
      : cards;

    const rows = sorted.slice(0, topN).map((client) => ({
      id: client.id,
      slug: client.slug,
      name: client.name,
      metrics: Object.fromEntries(
        columns.map((col) => [col, client.metrics?.[col] ?? 0])
      )
    }));

    return NextResponse.json({
      ok: true,
      entity,
      columns,
      rows,
      source: "db"
    });
  } catch (err) {
    console.error("[dashboard/table-data GET]", err);
    return NextResponse.json({ ok: false, error: "Erro" }, { status: 500 });
  }
}
