import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { getMetaConnectionInfo } from "@/lib/meta-auth-store";
import { resetWorkspaceData } from "@/lib/reset-workspace-data";

export const maxDuration = 60;

/**
 * Reset de DADOS do workspace: apaga clientes, contas e toda a conexão/dados da
 * Meta, mantendo as estruturas do app (tenant, usuários, membros). Irreversível.
 *
 * Só admins (mesma regra de canManage da conexão Meta) e exige confirmação
 * explícita: body { confirm: "RESET" }.
 */
export async function POST(req: Request) {
  let ctx;
  try {
    ctx = await getAppContext();
  } catch {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { tenant, user, metaAccessToken } = ctx;

  const body = (await req.json().catch(() => ({}))) as { confirm?: string };
  if (body.confirm !== "RESET") {
    return NextResponse.json({ ok: false, error: "confirm_required" }, { status: 400 });
  }

  const info = await getMetaConnectionInfo(tenant.id, user.id, metaAccessToken);
  if (info.role !== "admin") {
    return NextResponse.json({ ok: false, error: "not_allowed" }, { status: 403 });
  }

  const counts = await resetWorkspaceData(tenant.id);
  const totalDeleted = Object.values(counts).reduce((s, n) => s + n, 0);

  return NextResponse.json({ ok: true, counts, totalDeleted });
}
