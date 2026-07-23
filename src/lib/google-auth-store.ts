import "server-only";

import { repositories } from "@/db/repositories";
import { getGoogleClientId, getGoogleClientSecret, GOOGLE_ADS_SCOPES } from "@/lib/google-env";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

/** Renova access tokens ~1min antes de expirar, para evitar corridas na borda. */
const EXPIRY_SKEW_MS = 60_000;

export type GoogleTokenPayload = {
  access_token: string;
  refresh_token?: string | null;
  scope?: string | null;
  /** Epoch em segundos (como o Google devolve via expires_in convertido). */
  expires_at?: number | null;
};

export async function persistGoogleAuth(userId: string, token: GoogleTokenPayload) {
  if (!token.access_token) return;

  const { googleAuth: repo } = await repositories();

  let row = await repo.findOne({ where: { userId } });
  if (!row) row = repo.create({ userId });

  row.accessToken = token.access_token;
  // O Google só devolve refresh_token no 1º consent (access_type=offline + prompt=consent).
  // Reconexões sem novo consent NÃO retornam refresh_token — preserve o existente.
  if (token.refresh_token) row.refreshToken = token.refresh_token;
  row.scopes = typeof token.scope === "string" ? token.scope : GOOGLE_ADS_SCOPES;
  row.expiresAt = token.expires_at ? new Date(token.expires_at * 1000) : null;

  await repo.save(row);
}

export async function clearGoogleAuth(userId: string): Promise<void> {
  const { googleAuth: repo } = await repositories();
  await repo.delete({ userId });
}

/**
 * Troca o refresh_token por um access_token novo (grant_type=refresh_token).
 * Google Ads: access tokens vivem ~1h; o refresh_token é de longa duração.
 */
export async function refreshGoogleAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in?: number;
  scope?: string;
} | null> {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: getGoogleClientId(),
    client_secret: getGoogleClientSecret(),
    refresh_token: refreshToken
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: params.toString()
  });

  const json = (await res.json().catch(() => null)) as {
    access_token?: string;
    expires_in?: number;
    scope?: string;
    error?: string;
  } | null;

  if (!res.ok || !json?.access_token) return null;
  return { access_token: json.access_token, expires_in: json.expires_in, scope: json.scope };
}

/**
 * Access token Google válido para o usuário. Renova automaticamente via refresh_token
 * quando expirado (e persiste o novo). Retorna undefined se não houver conexão utilizável.
 */
export async function getStoredGoogleAccessToken(userId: string): Promise<string | undefined> {
  const { googleAuth: repo } = await repositories();
  const row = await repo.findOne({ where: { userId }, order: { updatedAt: "DESC" } });
  if (!row?.accessToken && !row?.refreshToken) return undefined;

  const expired = !row.expiresAt || row.expiresAt.getTime() - EXPIRY_SKEW_MS < Date.now();
  if (!expired && row.accessToken) return row.accessToken;

  // Expirado (ou sem access token): tenta renovar.
  if (!row.refreshToken) return row.accessToken ?? undefined;

  const refreshed = await refreshGoogleAccessToken(row.refreshToken);
  if (!refreshed) return undefined;

  const expiresAt = refreshed.expires_in
    ? Math.floor(Date.now() / 1000) + refreshed.expires_in
    : null;

  row.accessToken = refreshed.access_token;
  if (refreshed.scope) row.scopes = refreshed.scope;
  row.expiresAt = expiresAt ? new Date(expiresAt * 1000) : null;
  await repo.save(row);

  return refreshed.access_token;
}

export async function hasGoogleAdsConnected(userId: string): Promise<boolean> {
  const { googleAuth: repo } = await repositories();
  const row = await repo.findOne({ where: { userId } });
  return !!(row?.refreshToken || row?.accessToken);
}

/**
 * Access token Google para operações do workspace (ex.: dashboard de um cliente).
 * Retorna o token do primeiro usuário do tenant com conexão válida — assim a
 * visualização funciona para qualquer membro, não só quem conectou. Espelha o
 * fallback de token do Meta (getWorkspaceMetaTokens).
 */
export async function getWorkspaceGoogleAccessToken(
  tenantId: string
): Promise<string | undefined> {
  const { user: userRepo } = await repositories();
  const users = await userRepo.find({ where: { tenantId }, select: { id: true } });
  for (const u of users) {
    const token = await getStoredGoogleAccessToken(u.id);
    if (token) return token;
  }
  return undefined;
}
