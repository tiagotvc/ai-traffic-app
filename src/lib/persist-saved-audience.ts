import "server-only";

import { createSavedAudience } from "@/lib/meta-audience-create";
import {
  isMetaSavedAudienceCreateBlocked,
  formatMetaSavedAudienceCreateError
} from "@/lib/meta-graph-errors";
import { sanitizeTargetingForMeta } from "@/lib/meta-targeting-sanitize";
import { finalizeFlexibleSpecTargeting } from "@/lib/meta-targeting-prune";
import {
  saveClientSavedTargeting,
  toLocalSavedTargetingId
} from "@/lib/client-saved-targeting";

export type PersistSavedAudienceResult = {
  savedAudienceId: string;
  storage: "meta" | "local";
  warning?: string;
  removedSegments?: Array<{ id: string; name?: string }>;
};

/** Tenta criar na Meta; se a API bloquear (#3), salva localmente com targeting sanitizado. */
export async function persistSavedAudience(args: {
  tenantId: string;
  clientIdOrSlug: string;
  adAccountId: string;
  name: string;
  targeting: Record<string, unknown>;
  metaAccessToken: string;
}): Promise<PersistSavedAudienceResult> {
  const sanitized = sanitizeTargetingForMeta(args.targeting);
  const { targeting, removed } = await finalizeFlexibleSpecTargeting(
    sanitized,
    args.metaAccessToken,
    args.adAccountId
  );
  const removedSegments = removed.length ? removed : undefined;

  try {
    const created = await createSavedAudience(args.metaAccessToken, args.adAccountId, {
      name: args.name,
      targeting
    });
    return { savedAudienceId: created.id, storage: "meta", removedSegments };
  } catch (error) {
    if (!isMetaSavedAudienceCreateBlocked(error)) {
      throw new Error(formatMetaSavedAudienceCreateError(error));
    }

    const local = await saveClientSavedTargeting({
      tenantId: args.tenantId,
      clientIdOrSlug: args.clientIdOrSlug,
      adAccountId: args.adAccountId,
      name: args.name,
      targeting
    });

    return {
      savedAudienceId: toLocalSavedTargetingId(local.id),
      storage: "local",
      warning: formatMetaSavedAudienceCreateError(error),
      removedSegments
    };
  }
}
