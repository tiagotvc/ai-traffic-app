import "server-only";

import { isMetaFlexSpecBucket } from "@/lib/meta-targeting-flex";
import { validateTargetingIdList, type MetaTargetingValidationItem } from "@/lib/meta-graph";

export type PrunedTargetingItem = { id: string; name?: string };

export function collectFlexibleSpecIds(flexibleSpec: unknown): string[] {
  if (!Array.isArray(flexibleSpec)) return [];
  const ids: string[] = [];
  for (const group of flexibleSpec) {
    if (!group || typeof group !== "object") continue;
    for (const value of Object.values(group as Record<string, unknown>)) {
      if (!Array.isArray(value)) continue;
      for (const item of value) {
        if (item && typeof item === "object" && "id" in item) {
          const id = String((item as { id: unknown }).id ?? "").trim();
          if (id) ids.push(id);
        }
      }
    }
  }
  return ids;
}

/** Remove interesses/comportamentos que a Meta marcou como inválidos ou descontinuados. */
export async function pruneInvalidTargetingIds(
  targeting: Record<string, unknown>,
  accessToken: string,
  adAccountId: string,
  prevalidated?: MetaTargetingValidationItem[]
): Promise<{ targeting: Record<string, unknown>; removed: PrunedTargetingItem[] }> {
  const flex = targeting.flexible_spec;
  const ids = collectFlexibleSpecIds(flex);
  if (!ids.length) return { targeting, removed: [] };

  let validation: MetaTargetingValidationItem[];
  try {
    if (prevalidated) {
      const idSet = new Set(ids);
      validation = prevalidated.filter((row) => idSet.has(row.id));
    } else {
      validation = await validateTargetingIdList(accessToken, adAccountId, ids);
    }
  } catch {
    return { targeting, removed: [] };
  }

  const invalidIds = new Set(
    validation.filter((row) => row.valid === false).map((row) => row.id)
  );
  if (!invalidIds.size) return { targeting, removed: [] };

  const removed: PrunedTargetingItem[] = [];
  const nextFlex = (flex as Array<Record<string, unknown>>)
    .map((group) => {
      const nextGroup: Record<string, Array<{ id: string; name?: string }>> = {};
      for (const [key, value] of Object.entries(group)) {
        if (!isMetaFlexSpecBucket(key) || !Array.isArray(value)) continue;
        const kept = value.filter((item) => {
          if (!item || typeof item !== "object" || !("id" in item)) return false;
          const id = String((item as { id: unknown }).id ?? "").trim();
          if (!id || !invalidIds.has(id)) return true;
          removed.push({
            id,
            name: typeof (item as { name?: unknown }).name === "string" ? (item as { name: string }).name : undefined
          });
          return false;
        });
        if (kept.length) nextGroup[key] = kept as Array<{ id: string; name?: string }>;
      }
      return Object.keys(nextGroup).length ? nextGroup : null;
    })
    .filter(Boolean);

  const next: Record<string, unknown> = { ...targeting };
  if (nextFlex.length) next.flexible_spec = nextFlex;
  else delete next.flexible_spec;

  return { targeting: next, removed };
}

export class PersonaTargetingInvalidError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PersonaTargetingInvalidError";
  }
}

/** Valida flexible_spec na Meta e remove IDs descontinuados antes de salvar/publicar. */
export async function finalizeFlexibleSpecTargeting(
  targeting: Record<string, unknown>,
  accessToken: string,
  adAccountId: string
): Promise<{ targeting: Record<string, unknown>; removed: PrunedTargetingItem[] }> {
  const hadIds = collectFlexibleSpecIds(targeting.flexible_spec).length > 0;
  const result = await pruneInvalidTargetingIds(targeting, accessToken, adAccountId);
  const hasIds = collectFlexibleSpecIds(result.targeting.flexible_spec).length > 0;

  if (hadIds && !hasIds) {
    throw new PersonaTargetingInvalidError(
      "A Meta descontinuou todos os interesses/comportamentos selecionados. Gere a persona novamente ou ajuste o briefing."
    );
  }

  return result;
}
