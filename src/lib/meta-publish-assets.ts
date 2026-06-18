import "server-only";

import { getInventoryMap } from "@/lib/meta-ad-accounts";
import { listTenantPages } from "@/lib/meta-discover";
import {
  fetchInstagramAccountsForAdAccount,
  fetchInstagramFromPages,
  fetchPagesForAdAccount,
  fetchUserPages
} from "@/lib/meta-graph";

export type PublishPage = { metaPageId: string; name: string };
export type PublishInstagram = { id: string; username: string };

function mergePages(
  ...lists: Array<Array<{ id?: string; metaPageId?: string; name?: string }>>
): PublishPage[] {
  const map = new Map<string, PublishPage>();
  for (const list of lists) {
    for (const row of list) {
      const id = (row.metaPageId ?? row.id)?.trim();
      if (!id) continue;
      const name = row.name?.trim() || id;
      if (!map.has(id)) map.set(id, { metaPageId: id, name });
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Páginas utilizáveis na publicação: live da conta + inventário local. */
export async function resolvePagesForAdAccount(input: {
  tenantId: string;
  adAccountId: string;
  metaAccessToken?: string | null;
}): Promise<PublishPage[]> {
  const inv = await getInventoryMap(input.tenantId);
  const bmFilter = inv.get(input.adAccountId)?.metaBusinessId ?? undefined;
  const dbPages = (await listTenantPages(input.tenantId, bmFilter)).map((p) => ({
    id: p.metaPageId,
    name: p.name
  }));

  if (!input.metaAccessToken) return mergePages(dbPages);

  const livePages = (await fetchPagesForAdAccount(input.metaAccessToken, input.adAccountId)).map(
    (p) => ({ id: p.id, name: p.name ?? p.id })
  );

  let merged = mergePages(dbPages, livePages);

  if (!merged.length) {
    const allDb = (await listTenantPages(input.tenantId)).map((p) => ({
      id: p.metaPageId,
      name: p.name
    }));
    merged = mergePages(allDb, livePages);
  }

  if (!merged.length) {
    const userPages = await fetchUserPages(input.metaAccessToken).catch(() => []);
    merged = mergePages(userPages.map((p) => ({ id: p.id, name: p.name ?? p.id })));
  }

  return merged;
}

/** Contas Instagram utilizáveis: edge da conta + IG conectado às páginas. */
export async function resolveInstagramForAdAccount(input: {
  metaAccessToken: string;
  adAccountId: string;
  pages?: PublishPage[];
}): Promise<PublishInstagram[]> {
  const fromAccount = await fetchInstagramAccountsForAdAccount(
    input.metaAccessToken,
    input.adAccountId
  );
  if (fromAccount.length) {
    return fromAccount.map((i) => ({
      id: i.id,
      username: i.username?.trim() || i.id
    }));
  }

  const pageIds = (input.pages ?? []).map((p) => p.metaPageId);
  if (!pageIds.length) return [];

  const fromPages = await fetchInstagramFromPages(input.metaAccessToken, pageIds);
  return fromPages.map((i) => ({
    id: i.id,
    username: i.username?.trim() || i.id
  }));
}
