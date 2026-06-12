import { NextResponse } from "next/server";
import { In, IsNull, MoreThan } from "typeorm";

import { getAppContext } from "@/lib/app-context";
import { repositories } from "@/db/repositories";
import {
  buildInviteUrl,
  createWorkspaceInvite,
  isWorkspaceAdmin
} from "@/lib/workspace-members";

export async function GET() {
  const { tenant, user } = await getAppContext();
  const { tenantMember: memberRepo, tenantInvite: inviteRepo, user: userRepo } =
    await repositories();

  const members = await memberRepo.find({ where: { tenantId: tenant.id } });
  const userIds = members.map((m) => m.userId);
  const users =
    userIds.length > 0 ? await userRepo.find({ where: { id: In(userIds) } }) : [];
  const userById = new Map(users.map((u) => [u.id, u]));

  const invites = await inviteRepo.find({
    where: { tenantId: tenant.id, acceptedAt: IsNull(), expiresAt: MoreThan(new Date()) },
    order: { createdAt: "DESC" }
  });

  const origin = process.env.NEXTAUTH_URL ?? "";

  return NextResponse.json({
    ok: true,
    isAdmin: await isWorkspaceAdmin(tenant.id, user.id),
    members: members.map((m) => {
      const u = userById.get(m.userId);
      return {
        userId: m.userId,
        email: u?.email ?? "—",
        name: u?.name ?? null,
        role: m.role,
        isSelf: m.userId === user.id
      };
    }),
    invites: invites.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      expiresAt: i.expiresAt.toISOString(),
      inviteUrl: buildInviteUrl(i.token, origin)
    }))
  });
}

export async function POST(req: Request) {
  const { tenant, user } = await getAppContext();
  if (!(await isWorkspaceAdmin(tenant.id, user.id))) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as {
    email?: string;
    role?: "admin" | "member";
  } | null;

  const email = body?.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }

  const role = body?.role === "admin" ? "admin" : "member";

  try {
    const { assertLimit } = await import("@/lib/billing/entitlements");
    await assertLimit(tenant.id, "maxMembers");
  } catch (err) {
    const { billingErrorResponse } = await import("@/lib/billing/api-errors");
    const res = billingErrorResponse(err);
    if (res) return res;
    throw err;
  }

  const invite = await createWorkspaceInvite({
    tenantId: tenant.id,
    email,
    role,
    invitedByUserId: user.id
  });

  const origin = process.env.NEXTAUTH_URL ?? "";
  return NextResponse.json({
    ok: true,
    invite: {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      inviteUrl: buildInviteUrl(invite.token, origin)
    }
  });
}
