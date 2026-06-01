import "server-only";

import { randomUUID } from "crypto";
import { IsNull, MoreThan } from "typeorm";

import type { TenantInvite } from "@/db/entities/TenantInvite";
import type { User } from "@/db/entities/User";
import { repositories } from "@/db/repositories";

const INVITE_DAYS = 14;

export async function ensureTenantMember(tenantId: string, userId: string) {
  const { tenantMember: memberRepo } = await repositories();
  const existing = await memberRepo.findOne({ where: { tenantId, userId } });
  if (existing) return existing;

  const count = await memberRepo.count({ where: { tenantId } });
  const role = count === 0 ? "admin" : "member";
  const row = memberRepo.create({ tenantId, userId, role });
  return memberRepo.save(row);
}

export async function isWorkspaceAdmin(tenantId: string, userId: string) {
  const { tenantMember: memberRepo } = await repositories();
  const member = await memberRepo.findOne({ where: { tenantId, userId } });
  if (member) return member.role === "admin";
  const count = await memberRepo.count({ where: { tenantId } });
  return count === 0;
}

export async function getUserWorkspaceMembership(userId: string) {
  const { tenantMember: memberRepo } = await repositories();
  return memberRepo.findOne({
    where: { userId },
    order: { createdAt: "DESC" }
  });
}

async function joinUserToInvite(user: User, invite: TenantInvite) {
  const { tenantInvite: inviteRepo, tenantMember: memberRepo, user: userRepo } = await repositories();

  await memberRepo.delete({ userId: user.id });

  user.tenantId = invite.tenantId;
  await userRepo.save(user);

  await memberRepo.save(
    memberRepo.create({
      tenantId: invite.tenantId,
      userId: user.id,
      role: invite.role
    })
  );

  invite.acceptedAt = new Date();
  await inviteRepo.save(invite);
}

export async function acceptPendingInviteForEmail(user: User, email: string) {
  const normalized = email.toLowerCase().trim();
  const { tenantInvite: inviteRepo } = await repositories();

  const invite = await inviteRepo.findOne({
    where: {
      email: normalized,
      acceptedAt: IsNull(),
      expiresAt: MoreThan(new Date())
    },
    order: { createdAt: "DESC" }
  });

  if (!invite) return false;

  await joinUserToInvite(user, invite);
  return true;
}

export async function acceptInviteByToken(user: User, token: string) {
  const { tenantInvite: inviteRepo } = await repositories();

  const invite = await inviteRepo.findOne({
    where: { token: token.trim(), acceptedAt: IsNull() }
  });
  if (!invite || invite.expiresAt < new Date()) {
    return { ok: false as const, error: "invalid_or_expired" as const };
  }

  // Token no link é a prova de posse — login Meta nem sempre usa o mesmo e-mail do convite.
  await joinUserToInvite(user, invite);
  return { ok: true as const };
}

export async function createWorkspaceInvite(input: {
  tenantId: string;
  email: string;
  role: "admin" | "member";
  invitedByUserId: string;
}) {
  const { tenantInvite: inviteRepo } = await repositories();
  const email = input.email.toLowerCase().trim();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_DAYS);

  const invite = inviteRepo.create({
    tenantId: input.tenantId,
    email,
    role: input.role,
    token: randomUUID(),
    expiresAt,
    invitedByUserId: input.invitedByUserId
  });
  await inviteRepo.save(invite);
  return invite;
}

export function buildInviteUrl(token: string, origin?: string, locale = "pt-BR") {
  const base = origin ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/${locale}/invite?token=${encodeURIComponent(token)}`;
}

export async function getInvitePreview(token: string) {
  const { tenantInvite: inviteRepo, tenant: tenantRepo } = await repositories();
  const invite = await inviteRepo.findOne({ where: { token: token.trim(), acceptedAt: IsNull() } });
  if (!invite || invite.expiresAt < new Date()) return null;
  const tenant = await tenantRepo.findOne({ where: { id: invite.tenantId } });
  return {
    email: invite.email,
    role: invite.role,
    workspaceName: tenant?.brandName ?? tenant?.name ?? "Workspace"
  };
}
