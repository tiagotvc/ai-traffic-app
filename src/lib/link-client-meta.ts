import "server-only";

import { In } from "typeorm";

import { repositories } from "@/db/repositories";
import type { Client } from "@/db/entities/Client";
import { getOrCreateClientMetaSettings } from "@/lib/client-meta-settings";
import { listMetaAdAccountOptions } from "@/lib/meta-ad-accounts";
import { runMetaDiscoverForBusiness } from "@/lib/meta-discover";

export async function linkClientMetaAccounts(input: {
  tenantId: string;
  clientId: string;
  metaAdAccountIds: string[];
  metaAccessToken?: string;
  metaBusinessId?: string | null;
}) {
  const { adAccount: adAccountRepo, client: clientRepo, metaAdAccountInventory: inventoryRepo } =
    await repositories();

  const allAvailable = await listMetaAdAccountOptions({
    tenantId: input.tenantId,
    metaAccessToken: input.metaAccessToken,
    hideDemoWhenRealExists: true
  });
  const availableMap = new Map(allAvailable.map((a) => [a.metaAdAccountId, a]));

  async function resolveAccountMeta(metaId: string) {
    if (availableMap.has(metaId)) {
      return {
        metaId,
        label: availableMap.get(metaId)!.label,
        metaBusinessId: availableMap.get(metaId)!.metaBusinessId ?? input.metaBusinessId ?? null
      };
    }
    const variants = [
      metaId,
      metaId.startsWith("act_") ? metaId.slice(4) : `act_${metaId}`
    ];
    for (const v of variants) {
      const inv = await inventoryRepo.findOne({ where: { tenantId: input.tenantId, metaAdAccountId: v } });
      if (inv) {
        return {
          metaId: inv.metaAdAccountId,
          label: inv.label ?? inv.metaAdAccountId,
          metaBusinessId: inv.metaBusinessId ?? input.metaBusinessId ?? null
        };
      }
    }
    return null;
  }

  const allClients = await clientRepo.find({ where: { tenantId: input.tenantId } });
  const otherClientIds = allClients.filter((c) => c.id !== input.clientId).map((c) => c.id);
  const others =
    otherClientIds.length > 0
      ? await adAccountRepo.find({ where: { clientId: In(otherClientIds) } })
      : [];

  const current = await adAccountRepo.find({ where: { clientId: input.clientId } });
  const resolved = (
    await Promise.all(input.metaAdAccountIds.map((id) => resolveAccountMeta(id)))
  ).filter(Boolean) as Array<{ metaId: string; label: string; metaBusinessId: string | null }>;
  const want = new Map(resolved.map((r) => [r.metaId, r]));

  for (const row of current) {
    if (!want.has(row.metaAdAccountId)) {
      await adAccountRepo.remove(row);
    }
  }

  const currentIds = new Set(
    (await adAccountRepo.find({ where: { clientId: input.clientId } })).map((a) => a.metaAdAccountId)
  );

  for (const { metaId, label, metaBusinessId } of want.values()) {
    if (currentIds.has(metaId)) continue;

    const onOther = others.find((a) => a.metaAdAccountId === metaId);
    if (onOther) {
      onOther.clientId = input.clientId;
      onOther.metaBusinessId = metaBusinessId ?? onOther.metaBusinessId;
      await adAccountRepo.save(onOther);
    } else {
      await adAccountRepo.save(
        adAccountRepo.create({
          clientId: input.clientId,
          metaAdAccountId: metaId,
          metaBusinessId,
          label
        })
      );
    }
  }

  return adAccountRepo.find({ where: { clientId: input.clientId } });
}

/**
 * Vincula ao cliente TODAS as contas de anúncio da BM informada (fluxo simplificado:
 * Criar Cliente → Nome → BM → puxa todos os ativos da BM). Retorna as contas vinculadas
 * e a lista de páginas da BM (para auto-seleção de página quando houver apenas uma).
 */
export async function linkAllBmAccountsToClient(input: {
  tenantId: string;
  clientId: string;
  metaBusinessId: string;
  metaBusinessName?: string | null;
  metaAccessToken?: string;
}) {
  // Descoberta sob demanda: persiste os ativos desta BM antes de vincular (rápido,
  // sem depender da sincronização pesada de todos os BMs).
  if (input.metaAccessToken) {
    try {
      await runMetaDiscoverForBusiness(
        input.tenantId,
        input.metaAccessToken,
        input.metaBusinessId,
        input.metaBusinessName
      );
    } catch {
      // Se a descoberta da BM falhar, segue com o que houver no inventário.
    }
  }

  const options = await listMetaAdAccountOptions({
    tenantId: input.tenantId,
    metaBusinessId: input.metaBusinessId,
    metaAccessToken: input.metaAccessToken,
    hideDemoWhenRealExists: true
  });
  const metaAdAccountIds = options.map((a) => a.metaAdAccountId);

  const linked = await linkClientMetaAccounts({
    tenantId: input.tenantId,
    clientId: input.clientId,
    metaAdAccountIds,
    metaAccessToken: input.metaAccessToken,
    metaBusinessId: input.metaBusinessId
  });

  return { linked, accountOptions: options };
}

export async function applyClientMetaSettings(input: {
  client: Client;
  metaPageId?: string | null;
  metaLinkUrl?: string | null;
  metaPixelId?: string | null;
  defaultAdAccountId?: string | null;
}) {
  const settings = await getOrCreateClientMetaSettings(input.client.id);

  if (input.metaPageId !== undefined) {
    input.client.metaPageId = input.metaPageId?.trim() || null;
  }
  if (input.metaLinkUrl !== undefined) {
    input.client.metaLinkUrl = input.metaLinkUrl?.trim() || null;
  }

  const { client: clientRepo, clientMetaSettings: settingsRepo } = await repositories();
  await clientRepo.save(input.client);

  if (input.metaPixelId !== undefined) {
    settings.metaPixelId = input.metaPixelId?.trim() || null;
  }
  if (input.defaultAdAccountId !== undefined) {
    settings.defaultAdAccountId = input.defaultAdAccountId?.trim() || null;
  }
  await settingsRepo.save(settings);

  return settings;
}
