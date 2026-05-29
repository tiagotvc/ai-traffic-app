import "server-only";

import { In } from "typeorm";

import { repositories } from "@/db/repositories";
import type { Client } from "@/db/entities/Client";
import { getOrCreateClientMetaSettings } from "@/lib/client-meta-settings";
import { listMetaAdAccountOptions } from "@/lib/meta-ad-accounts";

export async function linkClientMetaAccounts(input: {
  tenantId: string;
  clientId: string;
  metaAdAccountIds: string[];
  metaAccessToken?: string;
  metaBusinessId?: string | null;
}) {
  const { adAccount: adAccountRepo, client: clientRepo } = await repositories();

  const available = await listMetaAdAccountOptions({
    tenantId: input.tenantId,
    metaBusinessId: input.metaBusinessId ?? undefined,
    metaAccessToken: input.metaAccessToken,
    hideDemoWhenRealExists: true
  });
  const availableMap = new Map(available.map((a) => [a.metaAdAccountId, a]));
  const inventoryMeta = new Map(
    available.map((a) => [a.metaAdAccountId, a.metaBusinessId ?? input.metaBusinessId ?? null])
  );

  const allClients = await clientRepo.find({ where: { tenantId: input.tenantId } });
  const otherClientIds = allClients.filter((c) => c.id !== input.clientId).map((c) => c.id);
  const others =
    otherClientIds.length > 0
      ? await adAccountRepo.find({ where: { clientId: In(otherClientIds) } })
      : [];

  const current = await adAccountRepo.find({ where: { clientId: input.clientId } });
  const want = new Set(input.metaAdAccountIds.filter((id) => availableMap.has(id)));

  for (const row of current) {
    if (!want.has(row.metaAdAccountId)) {
      await adAccountRepo.remove(row);
    }
  }

  const currentIds = new Set(
    (await adAccountRepo.find({ where: { clientId: input.clientId } })).map((a) => a.metaAdAccountId)
  );

  for (const metaId of want) {
    if (currentIds.has(metaId)) continue;

    const onOther = others.find((a) => a.metaAdAccountId === metaId);
    if (onOther) {
      onOther.clientId = input.clientId;
      onOther.metaBusinessId = inventoryMeta.get(metaId) ?? onOther.metaBusinessId;
      await adAccountRepo.save(onOther);
    } else {
      await adAccountRepo.save(
        adAccountRepo.create({
          clientId: input.clientId,
          metaAdAccountId: metaId,
          metaBusinessId: inventoryMeta.get(metaId) ?? null,
          label: availableMap.get(metaId)?.label ?? null
        })
      );
    }
  }

  return adAccountRepo.find({ where: { clientId: input.clientId } });
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
