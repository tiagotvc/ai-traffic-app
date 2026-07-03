import "server-only";

import { getAppContext } from "@/lib/app-context";
import {
  assertViewClientScope,
  resolvePublishedViewByToken,
  type PublishedViewAccess
} from "@/lib/dashboard/client-view-access";

export type DashboardDataAuth =
  | { ok: true; tenantId: string; viewAccess: PublishedViewAccess | null }
  | { ok: false; status: number; error: string };

export async function resolveDashboardDataAuth(req: Request): Promise<DashboardDataAuth> {
  const url = new URL(req.url);
  const viewToken = url.searchParams.get("viewToken")?.trim();
  if (viewToken) {
    const view = await resolvePublishedViewByToken(viewToken);
    if (!view) return { ok: false, status: 404, error: "View not found" };
    return { ok: true, tenantId: view.tenantId, viewAccess: view };
  }

  try {
    // O dashboard BÁSICO (summary/timeseries/table-data) é de todos os planos — o gate
    // `allowDashboardCanvas` vale só para as features do canvas (layouts, widgets,
    // templates, AI widgets), que fazem o assert nas próprias rotas. Dados são do
    // próprio tenant; plano nunca deve esconder as métricas da conta.
    const { tenant } = await getAppContext();
    return { ok: true, tenantId: tenant.id, viewAccess: null };
  } catch {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
}

export function enforceViewClientScope(
  viewAccess: PublishedViewAccess | null,
  clientIdOrSlug: string | null | undefined
): string | null {
  if (!viewAccess) return clientIdOrSlug?.trim() || null;
  try {
    assertViewClientScope(viewAccess, clientIdOrSlug);
  } catch {
    throw new Error("Client scope mismatch");
  }
  if (clientIdOrSlug?.trim()) return clientIdOrSlug.trim();
  return viewAccess.clientSlug ?? viewAccess.clientId;
}
