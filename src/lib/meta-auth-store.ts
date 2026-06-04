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

/**
 * Token Meta do workspace.
 * Se há uma conexão oficial definida (`tenant.metaConnectionUserId`), retorna SOMENTE
 * o token do usuário designado — ignora `excludeUserId` (é a conexão do workspace, não
 * "o token de outra pessoa"). Sem conexão oficial, cai no legado: 1º admin com token.
 */
export async function getTenantMetaAccessToken(
  tenantId: string,
  excludeUserId?: string
): Promise<string | undefined> {
  const { tenant: tenantRepo, tenantMember: memberRepo, user: userRepo } = await repositories();

  const tenant = await tenantRepo.findOne({ where: { id: tenantId } });
  if (tenant?.metaConnectionUserId) {
    return getStoredMetaAccessToken(tenant.metaConnectionUserId);
  }

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

export type MetaConnectionInfo = {
  role: "admin" | "member";
  tokenSource: "workspace" | "own" | null;
  hasWorkspaceToken: boolean;
  hasEffectiveToken: boolean;
  /** Código para hint na UI (sync banner). */
  hintCode: "member_no_workspace_meta" | "admin_reconnect_meta" | null;
  /** Usuário dono da conexão Meta oficial (null se ainda não definida). */
  workspaceConnectionUserId: string | null;
  /** Nome do dono da conexão oficial (para exibir na UI). */
  workspaceConnectionName: string | null;
  /** O usuário atual é o dono da conexão oficial. */
  isOwner: boolean;
  /** O usuário atual pode definir/trocar/desconectar a conexão oficial. */
  canManage: boolean;
};

export async function hasWorkspaceMetaConnected(tenantId: string): Promise<boolean> {
  const { tenant: tenantRepo, tenantMember: memberRepo } = await repositories();

  const tenant = await tenantRepo.findOne({ where: { id: tenantId } });
  if (tenant?.metaConnectionUserId) {
    return !!(await getStoredMetaAccessToken(tenant.metaConnectionUserId));
  }

  const members = await memberRepo.find({ where: { tenantId } });
  for (const m of members) {
    const token = await getStoredMetaAccessToken(m.userId);
    if (token) return true;
  }
  return false;
}

export async function getMetaConnectionInfo(
  tenantId: string,
  userId: string,
  sessionToken?: string
): Promise<MetaConnectionInfo> {
  const { tenant: tenantRepo, tenantMember: memberRepo, user: userRepo } = await repositories();
  const member = await memberRepo.findOne({ where: { tenantId, userId } });
  const role: MetaConnectionInfo["role"] = member?.role === "member" ? "member" : "admin";
  const tenantToken = await getTenantMetaAccessToken(tenantId, userId);
  const ownToken = sessionToken ?? (await getStoredMetaAccessToken(userId));
  const hasWorkspaceToken = await hasWorkspaceMetaConnected(tenantId);

  const tenant = await tenantRepo.findOne({ where: { id: tenantId } });
  const connectionUserId = tenant?.metaConnectionUserId ?? null;
  const isOwner = !!connectionUserId && connectionUserId === userId;
  let connectionName: string | null = null;
  let ownerTokenValid = false;
  if (connectionUserId) {
    const owner = await userRepo.findOne({ where: { id: connectionUserId } });
    connectionName = owner?.name ?? null;
    ownerTokenValid = !!(await getStoredMetaAccessToken(connectionUserId));
  }
  // Admin pode gerenciar quando: não há dono ainda, ele é o dono, ou o token do dono
  // atual está ausente/expirado (escape para destravar um workspace com conexão quebrada).
  const canManage = role === "admin" && (!connectionUserId || isOwner || !ownerTokenValid);

  let tokenSource: MetaConnectionInfo["tokenSource"] = null;
  let hasEffectiveToken = false;

  if (role === "member") {
    if (tenantToken) {
      tokenSource = "workspace";
      hasEffectiveToken = true;
    }
  } else if (tenantToken) {
    tokenSource = "workspace";
    hasEffectiveToken = true;
  } else if (ownToken) {
    tokenSource = "own";
    hasEffectiveToken = true;
  }

  let hintCode: MetaConnectionInfo["hintCode"] = null;
  if (role === "member" && !hasWorkspaceToken) {
    hintCode = "member_no_workspace_meta";
  } else if (role === "admin" && !hasEffectiveToken) {
    hintCode = "admin_reconnect_meta";
  }

  return {
    role,
    tokenSource,
    hasWorkspaceToken,
    hasEffectiveToken,
    hintCode,
    workspaceConnectionUserId: connectionUserId,
    workspaceConnectionName: connectionName,
    isOwner,
    canManage
  };
}

/**
 * Token para ler contas de anúncio do workspace.
 * Membros usam só o token de um admin (nunca o Facebook pessoal do login).
 * Admins preferem token compartilhado do workspace, depois o próprio.
 */
export async function resolveWorkspaceMetaAccessToken(
  tenantId: string,
  userId: string,
  sessionToken?: string
): Promise<string | undefined> {
  const { tenant: tenantRepo, tenantMember: memberRepo } = await repositories();

  // Conexão oficial: token do dono para todos. Se o próprio dono está logado,
  // aceita o token de sessão (mais fresco) antes de cair no armazenado.
  const tenant = await tenantRepo.findOne({ where: { id: tenantId } });
  if (tenant?.metaConnectionUserId) {
    if (tenant.metaConnectionUserId === userId && sessionToken) return sessionToken;
    return getStoredMetaAccessToken(tenant.metaConnectionUserId);
  }

  const member = await memberRepo.findOne({ where: { tenantId, userId } });
  const tenantToken = await getTenantMetaAccessToken(tenantId, userId);
  const ownToken = sessionToken ?? (await getStoredMetaAccessToken(userId));

  if (member?.role === "member") {
    return tenantToken;
  }

  return tenantToken ?? ownToken;
}

export function isMetaPermissionError(message: string): boolean {
  return (
    message.includes("ads_management") ||
    message.includes("ads_read") ||
    message.includes("(#200)") ||
    message.includes("OAuthException")
  );
}
