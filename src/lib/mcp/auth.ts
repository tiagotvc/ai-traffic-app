import "server-only";

import { createHash, randomBytes } from "crypto";

import { repositories } from "@/db/repositories";

const TOKEN_PREFIX = "orion_mcp_";

export function hashMcpToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Cria um token (escopo tenant). Retorna o segredo **uma única vez**. */
export async function createMcpToken(tenantId: string, label?: string) {
  const secret = `${TOKEN_PREFIX}${randomBytes(24).toString("hex")}`;
  const { mcpToken: repo } = await repositories();
  const row = repo.create({
    tenantId,
    tokenHash: hashMcpToken(secret),
    label: label?.trim() || null
  });
  await repo.save(row);
  return { id: row.id, token: secret, label: row.label ?? null, createdAt: row.createdAt };
}

/** Verifica um token e retorna o tenantId (ou null). Atualiza `lastUsedAt`. */
export async function verifyMcpToken(token: string | null | undefined): Promise<string | null> {
  if (!token || !token.startsWith(TOKEN_PREFIX)) return null;
  const { mcpToken: repo } = await repositories();
  const row = await repo.findOne({ where: { tokenHash: hashMcpToken(token) } });
  if (!row || row.revokedAt) return null;
  row.lastUsedAt = new Date();
  await repo.save(row).catch(() => {});
  return row.tenantId;
}

export async function listMcpTokens(tenantId: string) {
  const { mcpToken: repo } = await repositories();
  const rows = await repo.find({ where: { tenantId }, order: { createdAt: "DESC" } });
  return rows
    .filter((r) => !r.revokedAt)
    .map((r) => ({
      id: r.id,
      label: r.label ?? null,
      createdAt: r.createdAt,
      lastUsedAt: r.lastUsedAt ?? null
    }));
}

export async function revokeMcpToken(tenantId: string, id: string): Promise<void> {
  const { mcpToken: repo } = await repositories();
  const row = await repo.findOne({ where: { id, tenantId } });
  if (row && !row.revokedAt) {
    row.revokedAt = new Date();
    await repo.save(row);
  }
}
