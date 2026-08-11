import "server-only";

import { repositories } from "@/db/repositories";

export type CreativeLibraryListItem = {
  id: string;
  headline: string;
  body: string;
  format: string;
  style: string;
  mimeType: string;
  imageBase64: string;
  visibility: "private" | "community";
  createdAt: string;
  clientId?: string | null;
  sourceItemId?: string | null;
};

/** Toda geração vira histórico automaticamente (privado) — best-effort, nunca derruba a
 * resposta da geração se a gravação falhar. */
export async function saveGeneratedVariants(args: {
  tenantId: string;
  clientId: string;
  createdByUserId: string | null;
  format: string;
  style: string;
  variants: Array<{ imageBase64: string; mimeType: string; headline: string; body: string }>;
}): Promise<void> {
  const { creativeLibraryItem } = await repositories();
  await Promise.all(
    args.variants.map((v) =>
      creativeLibraryItem.save(
        creativeLibraryItem.create({
          tenantId: args.tenantId,
          clientId: args.clientId,
          createdByUserId: args.createdByUserId,
          headline: v.headline,
          body: v.body,
          format: args.format,
          style: args.style,
          mimeType: v.mimeType,
          imageData: Buffer.from(v.imageBase64, "base64"),
          visibility: "private"
        })
      )
    )
  );
}

function toListItem(
  row: {
    id: string;
    headline: string;
    body: string;
    format: string;
    style: string;
    mimeType: string;
    imageData: Buffer;
    visibility: "private" | "community";
    createdAt: Date;
    clientId?: string | null;
    sourceItemId?: string | null;
  },
  includeClientId: boolean
): CreativeLibraryListItem {
  return {
    id: row.id,
    headline: row.headline,
    body: row.body,
    format: row.format,
    style: row.style,
    mimeType: row.mimeType,
    imageBase64: row.imageData.toString("base64"),
    visibility: row.visibility,
    createdAt: row.createdAt.toISOString(),
    clientId: includeClientId ? row.clientId : undefined,
    sourceItemId: includeClientId ? row.sourceItemId : undefined
  };
}

/** Histórico privado do tenant (todos os clientes) — o "estudar as melhorias no editor". */
export async function listMyLibraryItems(tenantId: string, limit = 60): Promise<CreativeLibraryListItem[]> {
  const { creativeLibraryItem } = await repositories();
  const rows = await creativeLibraryItem.find({
    where: { tenantId },
    order: { createdAt: "DESC" },
    take: limit
  });
  return rows.map((r) => toListItem(r, true));
}

/** Biblioteca comunitária — cruza TODOS os tenants de propósito, por isso nunca inclui
 * clientId/tenantId no retorno (`includeClientId=false`): nenhuma agência deve conseguir
 * identificar de qual cliente/concorrente veio um criativo compartilhado. */
export async function listCommunityLibraryItems(limit = 60): Promise<CreativeLibraryListItem[]> {
  const { creativeLibraryItem } = await repositories();
  const rows = await creativeLibraryItem.find({
    where: { visibility: "community" },
    order: { sharedAt: "DESC" },
    take: limit
  });
  return rows.map((r) => toListItem(r, false));
}

export async function shareLibraryItem(tenantId: string, id: string): Promise<boolean> {
  const { creativeLibraryItem } = await repositories();
  const item = await creativeLibraryItem.findOne({ where: { id, tenantId } });
  if (!item) return false;
  item.visibility = "community";
  item.sharedAt = new Date();
  await creativeLibraryItem.save(item);
  return true;
}

export async function unshareLibraryItem(tenantId: string, id: string): Promise<boolean> {
  const { creativeLibraryItem } = await repositories();
  const item = await creativeLibraryItem.findOne({ where: { id, tenantId } });
  if (!item) return false;
  item.visibility = "private";
  item.sharedAt = null;
  await creativeLibraryItem.save(item);
  return true;
}

/** Copia imagem+copy de um item comunitário — não custa crédito de IA (não gera nada
 * novo), fica só disponível pro reuso dentro do próprio Estúdio/Editor do tenant. */
export async function getCommunityItemForReuse(
  id: string
): Promise<{ imageBase64: string; mimeType: string; headline: string; body: string } | null> {
  const { creativeLibraryItem } = await repositories();
  const item = await creativeLibraryItem.findOne({ where: { id, visibility: "community" } });
  if (!item) return null;
  return {
    imageBase64: item.imageData.toString("base64"),
    mimeType: item.mimeType,
    headline: item.headline,
    body: item.body
  };
}

/** Grava a cópia local (privada) que resultou do reuso — guarda `sourceItemId` como
 * proveniência, base pro futuro crédito de recompensa quando virar campanha real publicada. */
export async function saveReusedVariant(args: {
  tenantId: string;
  clientId: string;
  createdByUserId: string | null;
  format: string;
  style: string;
  sourceItemId: string;
  variant: { imageBase64: string; mimeType: string; headline: string; body: string };
}): Promise<void> {
  const { creativeLibraryItem } = await repositories();
  await creativeLibraryItem.save(
    creativeLibraryItem.create({
      tenantId: args.tenantId,
      clientId: args.clientId,
      createdByUserId: args.createdByUserId,
      headline: args.variant.headline,
      body: args.variant.body,
      format: args.format,
      style: args.style,
      mimeType: args.variant.mimeType,
      imageData: Buffer.from(args.variant.imageBase64, "base64"),
      visibility: "private",
      sourceItemId: args.sourceItemId
    })
  );
}
