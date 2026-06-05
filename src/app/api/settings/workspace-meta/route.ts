import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";
import { getMetaConnectionInfo, getStoredMetaAccessToken } from "@/lib/meta-auth-store";

/**
 * Conexão Meta "oficial" do workspace.
 * - GET: estado (quem é o dono, nome, se o usuário atual pode gerenciar).
 * - POST { action: "claim" }: o usuário atual assume a conexão (vira o dono).
 * - POST { action: "disconnect", purgeAll? }: zera a conexão e apaga o(s) token(s).
 *
 * Só admins gerenciam, e apenas quando: não há dono ainda, são o dono, ou o token
 * do dono atual está ausente/expirado (escape para destravar conexão quebrada).
 */

export async function GET() {
  try {
    const { tenant, user, metaAccessToken } = await getAppContext();
    const info = await getMetaConnectionInfo(tenant.id, user.id, metaAccessToken);
    return NextResponse.json({ ok: true, ...info });
  } catch {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  let ctx;
  try {
    ctx = await getAppContext();
  } catch {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { tenant, user, metaAccessToken } = ctx;

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    purgeAll?: boolean;
  };
  const action = body.action;

  const info = await getMetaConnectionInfo(tenant.id, user.id, metaAccessToken);
  if (!info.canManage) {
    return NextResponse.json(
      { ok: false, error: "not_allowed" },
      { status: 403 }
    );
  }

  const { tenant: tenantRepo, tenantMember: memberRepo, user: userRepo, metaAuth: metaAuthRepo } =
    await repositories();

  if (action === "claim") {
    // Só assume quem tem um token Meta próprio válido (acabou de conectar a conta).
    const ownToken = await getStoredMetaAccessToken(user.id);
    if (!ownToken) {
      return NextResponse.json({ ok: false, error: "no_personal_token" }, { status: 400 });
    }
    const row = await tenantRepo.findOne({ where: { id: tenant.id } });
    if (!row) {
      return NextResponse.json({ ok: false, error: "tenant_not_found" }, { status: 404 });
    }
    row.metaConnectionUserId = user.id;
    await tenantRepo.save(row);

    const updated = await getMetaConnectionInfo(tenant.id, user.id, metaAccessToken);
    return NextResponse.json({ ok: true, ...updated });
  }

  if (action === "disconnect") {
    const row = await tenantRepo.findOne({ where: { id: tenant.id } });
    if (!row) {
      return NextResponse.json({ ok: false, error: "tenant_not_found" }, { status: 404 });
    }
    const previousOwnerId = row.metaConnectionUserId ?? null;

    // Quais tokens apagar:
    // - dono oficial definido → só o dele (alvo cirúrgico);
    // - legado (sem dono) ou purgeAll → todos os tokens do workspace, para "deixar limpo".
    let userIdsToPurge: string[];
    if (previousOwnerId && !body.purgeAll) {
      userIdsToPurge = [previousOwnerId];
    } else {
      const members = await memberRepo.find({ where: { tenantId: tenant.id } });
      const users = await userRepo.find({ where: { tenantId: tenant.id } });
      userIdsToPurge = Array.from(
        new Set([...members.map((m) => m.userId), ...users.map((u) => u.id)])
      );
    }

    row.metaConnectionUserId = null;
    await tenantRepo.save(row);

    for (const uid of userIdsToPurge) {
      await metaAuthRepo.delete({ userId: uid });
    }

    const updated = await getMetaConnectionInfo(tenant.id, user.id);
    return NextResponse.json({
      ok: true,
      purgedTokens: userIdsToPurge.length,
      ...updated
    });
  }

  return NextResponse.json({ ok: false, error: "unknown_action" }, { status: 400 });
}
