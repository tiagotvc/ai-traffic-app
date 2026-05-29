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
