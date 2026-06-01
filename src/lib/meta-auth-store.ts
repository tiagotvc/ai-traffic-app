import "server-only";

import { repositories } from "@/db/repositories";

export type MetaTokenPayload = {
  access_token: string;
  token_type?: string | null;
  scope?: string | null;
  expires_at?: number | null;
};

export async function persistMetaAuth(userId: string, account: MetaTokenPayload) {
  if (!account.access_token) return;

  const { metaAuth: repo } = await repositories();

  let row = await repo.findOne({ where: { userId } });
  if (!row) row = repo.create({ userId });

  row.accessToken = account.access_token;
  row.tokenType = account.token_type ?? null;
  row.scopes = typeof account.scope === "string" ? account.scope : null;
  row.expiresAt = account.expires_at ? new Date(account.expires_at * 1000) : null;

  await repo.save(row);
}

export async function getStoredMetaAccessToken(userId: string): Promise<string | undefined> {
  const { metaAuth: repo } = await repositories();
  const row = await repo.findOne({ where: { userId }, order: { updatedAt: "DESC" } });
  if (!row?.accessToken) return undefined;

  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
    return undefined;
  }

  return row.accessToken;
}

/** Token Meta de outro usuário do workspace (admin primeiro). */
export async function getTenantMetaAccessToken(
  tenantId: string,
  excludeUserId?: string
): Promise<string | undefined> {
  const { tenantMember: memberRepo, user: userRepo } = await repositories();
  const members = await memberRepo.find({ where: { tenantId } });
  const orderedUserIds = [
    ...members.filter((m) => m.role === "admin").map((m) => m.userId),
    ...members.filter((m) => m.role !== "admin").map((m) => m.userId)
  ];

  for (const uid of orderedUserIds) {
    if (excludeUserId && uid === excludeUserId) continue;
    const token = await getStoredMetaAccessToken(uid);
    if (token) return token;
  }

  const users = await userRepo.find({ where: { tenantId }, select: { id: true } });
  for (const u of users) {
    if (orderedUserIds.includes(u.id) || u.id === excludeUserId) continue;
    const token = await getStoredMetaAccessToken(u.id);
    if (token) return token;
  }

  return undefined;
}

/**
 * Token para ler contas de anúncio do workspace.
 * Membros convidados usam o token do admin; admins usam o próprio.
 */
export async function resolveWorkspaceMetaAccessToken(
  tenantId: string,
  userId: string,
  sessionToken?: string
): Promise<string | undefined> {
  const { tenantMember: memberRepo } = await repositories();
  const member = await memberRepo.findOne({ where: { tenantId, userId } });
  const tenantToken = await getTenantMetaAccessToken(tenantId, userId);
  const ownToken = sessionToken ?? (await getStoredMetaAccessToken(userId));

  if (member?.role === "member") {
    return tenantToken ?? ownToken;
  }

  return ownToken ?? tenantToken;
}

export function isMetaPermissionError(message: string): boolean {
  return (
    message.includes("ads_management") ||
    message.includes("ads_read") ||
    message.includes("(#200)") ||
    message.includes("OAuthException")
  );
}
