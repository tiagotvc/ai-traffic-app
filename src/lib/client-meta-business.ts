import "server-only";

import type { AdAccount } from "@/db/entities/AdAccount";
import type { Client } from "@/db/entities/Client";

/** BM do cliente: coluna salva ou inferida das contas já vinculadas. */
export function resolveClientMetaBusinessId(
  client: Pick<Client, "metaBusinessId">,
  linkedAccounts: Pick<AdAccount, "metaBusinessId">[]
): string | null {
  const saved = client.metaBusinessId?.trim();
  if (saved && saved !== "unassigned") return saved;

  const counts = new Map<string, number>();
  for (const a of linkedAccounts) {
    const bm = a.metaBusinessId?.trim();
    if (!bm) continue;
    counts.set(bm, (counts.get(bm) ?? 0) + 1);
  }
  let best: string | null = null;
  let max = 0;
  for (const [id, n] of counts) {
    if (n > max) {
      max = n;
      best = id;
    }
  }
  return best;
}

export function matchesClientBusinessScope(
  metaBusinessId: string | null | undefined,
  clientBm: string | null
): boolean {
  if (!clientBm || clientBm === "unassigned") return true;
  if (!metaBusinessId) return false;
  return metaBusinessId === clientBm;
}
