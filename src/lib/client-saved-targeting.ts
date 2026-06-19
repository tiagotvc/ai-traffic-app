import "server-only";

import { getClientBySlugOrId } from "@/lib/app-context";
import { getRepositories } from "@/db/repositories";
import { ClientSavedTargeting } from "@/db/entities/ClientSavedTargeting";
import { sanitizeTargetingForMeta } from "@/lib/meta-targeting-sanitize";

export const LOCAL_SAVED_TARGETING_PREFIX = "traffic-ai:";

export function toLocalSavedTargetingId(id: string): string {
  return `${LOCAL_SAVED_TARGETING_PREFIX}${id}`;
}

export function isLocalSavedTargetingId(id: string): boolean {
  return id.startsWith(LOCAL_SAVED_TARGETING_PREFIX);
}

export function parseLocalSavedTargetingId(id: string): string | null {
  if (!isLocalSavedTargetingId(id)) return null;
  return id.slice(LOCAL_SAVED_TARGETING_PREFIX.length);
}

export async function saveClientSavedTargeting(args: {
  tenantId: string;
  clientIdOrSlug: string;
  adAccountId: string;
  name: string;
  targeting: Record<string, unknown>;
  metaSavedAudienceId?: string | null;
}): Promise<ClientSavedTargeting> {
  const client = await getClientBySlugOrId(args.tenantId, args.clientIdOrSlug);
  if (!client) {
    throw new Error("Cliente não encontrado");
  }

  const metaAdAccountId = args.adAccountId.startsWith("act_")
    ? args.adAccountId
    : `act_${args.adAccountId}`;

  const row = getRepositories().clientSavedTargeting.create({
    tenantId: args.tenantId,
    clientId: client.id,
    metaAdAccountId,
    name: args.name.trim(),
    targeting: sanitizeTargetingForMeta(args.targeting),
    metaSavedAudienceId: args.metaSavedAudienceId ?? null
  });

  return getRepositories().clientSavedTargeting.save(row);
}

export async function listClientSavedTargeting(args: {
  tenantId: string;
  clientIdOrSlug: string;
  adAccountId: string;
}): Promise<ClientSavedTargeting[]> {
  const client = await getClientBySlugOrId(args.tenantId, args.clientIdOrSlug);
  if (!client) return [];

  const metaAdAccountId = args.adAccountId.startsWith("act_")
    ? args.adAccountId
    : `act_${args.adAccountId}`;

  return getRepositories().clientSavedTargeting.find({
    where: {
      tenantId: args.tenantId,
      clientId: client.id,
      metaAdAccountId
    },
    order: { updatedAt: "DESC" }
  });
}

export async function getClientSavedTargetingById(args: {
  tenantId: string;
  id: string;
}): Promise<ClientSavedTargeting | null> {
  return getRepositories().clientSavedTargeting.findOne({
    where: { tenantId: args.tenantId, id: args.id }
  });
}
