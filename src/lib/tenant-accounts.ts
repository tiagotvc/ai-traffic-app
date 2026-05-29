import "server-only";

import { In } from "typeorm";

import { repositories } from "@/db/repositories";
import { listClientsForTenant } from "@/lib/app-context";
import { runMetaDiscover } from "@/lib/meta-discover";

/** Sincroniza inventário Meta no tenant (não vincula a clientes). */
export async function ensureMetaInventorySynced(
  tenantId: string,
  metaAccessToken: string
) {
  return runMetaDiscover(tenantId, metaAccessToken);
}

/** Contas de anúncio vinculadas a clientes do tenant (para sync de métricas). */
export async function getLinkedAdAccountsForTenant(tenantId: string) {
  const { adAccount: adAccountRepo } = await repositories();
  const clients = await listClientsForTenant(tenantId);
  const clientIds = clients.map((c) => c.id);
  if (!clientIds.length) return { clients, accounts: [] as Awaited<ReturnType<typeof adAccountRepo.find>> };

  const accounts = await adAccountRepo.find({ where: { clientId: In(clientIds) } });
  return { clients, accounts };
}

/** @deprecated Use ensureMetaInventorySynced — mantido para compatibilidade de sync. */
export async function ensureMetaAccountsInDb(
  tenantId: string,
  _defaultClientId: string,
  metaAccessToken: string
) {
  await ensureMetaInventorySynced(tenantId, metaAccessToken);
  const { accounts } = await getLinkedAdAccountsForTenant(tenantId);
  return accounts;
}
