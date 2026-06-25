import "server-only";

import { validateTargetingIdList, type MetaTargetingValidationItem } from "@/lib/meta-graph";
import { collectFlexibleSpecIds } from "@/lib/meta-targeting-prune";

/** Valida todos os IDs de flexible_spec de uma publicação em uma única chamada à Meta. */
export async function buildPublishTargetingValidationCache(
  targetings: Array<Record<string, unknown>>,
  accessToken: string,
  adAccountId: string
): Promise<MetaTargetingValidationItem[] | undefined> {
  const uniqueIds = new Set<string>();
  for (const targeting of targetings) {
    for (const id of collectFlexibleSpecIds(targeting.flexible_spec)) {
      uniqueIds.add(id);
    }
  }
  if (!uniqueIds.size) return undefined;
  return validateTargetingIdList(accessToken, adAccountId, [...uniqueIds]);
}
