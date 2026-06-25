import "server-only";

import { extractPersonaTargetingItems } from "@/lib/audience-targeting-shared";
import {
  searchAdInterests,
  searchAdTargetingCategories,
  validateTargetingIdList
} from "@/lib/meta-graph";
import { resolveFlexBucket, type MetaFlexSpecBucket } from "@/lib/meta-targeting-flex";
import type { PersonaSegmentType } from "@/lib/persona-targeting-types";

export type SegmentRef = {
  id: string;
  name: string;
  type: PersonaSegmentType;
};

export type ReplacementCatalogItem = {
  type: PersonaSegmentType;
  id: string;
  name: string;
  audienceSize?: number;
  path?: string[];
  flexBucket?: MetaFlexSpecBucket;
  /** ID do segmento rejeitado que esta alternativa pode substituir. */
  replacesRejectedId?: string;
};

export type ReplacementHint = {
  rejected: SegmentRef;
  alternatives: SegmentRef[];
};

async function searchMetaCandidates(
  accessToken: string,
  segment: Pick<SegmentRef, "name" | "type">,
  limit: number
): Promise<Array<{ id: string; name: string; type: PersonaSegmentType; audienceSize?: number; path?: string[] }>> {
  const query = segment.name.trim();
  if (!query || query.length < 2) return [];

  if (segment.type === "interest") {
    const hits = await searchAdInterests(accessToken, query);
    return hits.slice(0, limit).map((h) => ({
      id: h.id,
      name: h.name,
      type: "interest" as const,
      audienceSize: h.audienceSize,
      path: h.path
    }));
  }

  const className = segment.type === "behavior" ? "behaviors" : "demographics";
  const hits = await searchAdTargetingCategories(accessToken, query, className);
  return hits.slice(0, limit).map((h) => ({
    id: h.id,
    name: h.name,
    type: segment.type,
    audienceSize: h.audience_size,
    path: h.path
  }));
}

/** Busca alternativas válidas na Meta para um segmento rejeitado (por nome). */
export async function searchReplacementCandidates(
  accessToken: string,
  adAccountId: string,
  segment: SegmentRef,
  options?: { limit?: number; excludeIds?: Iterable<string> }
): Promise<SegmentRef[]> {
  const limit = options?.limit ?? 8;
  const exclude = new Set(options?.excludeIds ?? []);
  exclude.add(segment.id);

  const candidates = await searchMetaCandidates(accessToken, segment, limit + 4);
  const filtered = candidates.filter((c) => !exclude.has(c.id));
  if (!filtered.length) return [];

  const validated = await validateTargetingIdList(
    accessToken,
    adAccountId,
    filtered.map((c) => c.id)
  );
  const validIds = new Set(validated.filter((row) => row.valid !== false).map((row) => row.id));

  return filtered.filter((c) => validIds.has(c.id)).slice(0, limit);
}

/** Atualiza nomes oficiais dos segmentos no targeting salvo (flexible_spec). */
export async function enrichTargetingWithMetaNames(
  targeting: Record<string, unknown>,
  accessToken: string,
  adAccountId: string
): Promise<Record<string, unknown>> {
  const segments = extractPersonaTargetingItems(targeting);
  if (!segments.length) return targeting;

  const validation = await validateTargetingIdList(
    accessToken,
    adAccountId,
    segments.map((s) => s.id)
  );
  const nameById = new Map(
    validation.filter((row) => row.name?.trim()).map((row) => [row.id, row.name!.trim()])
  );
  if (!nameById.size) return targeting;

  const flex = targeting.flexible_spec;
  if (!Array.isArray(flex)) return targeting;

  const nextFlex = flex.map((group) => {
    if (!group || typeof group !== "object") return group;
    const nextGroup: Record<string, Array<{ id: string; name?: string }>> = {};
    for (const [key, value] of Object.entries(group as Record<string, unknown>)) {
      if (!Array.isArray(value)) continue;
      nextGroup[key] = value.map((item) => {
        if (!item || typeof item !== "object" || !("id" in item)) return item;
        const id = String((item as { id: unknown }).id);
        const official = nameById.get(id);
        if (!official) return item as { id: string; name?: string };
        return { ...(item as { id: string; name?: string }), name: official };
      }) as Array<{ id: string; name?: string }>;
    }
    return nextGroup;
  });

  return { ...targeting, flexible_spec: nextFlex };
}

export async function buildReplacementCatalogFromRejected(
  accessToken: string,
  adAccountId: string,
  rejectedSegments: SegmentRef[]
): Promise<{ catalog: ReplacementCatalogItem[]; hints: ReplacementHint[] }> {
  const catalog: ReplacementCatalogItem[] = [];
  const hints: ReplacementHint[] = [];
  const seenIds = new Set<string>();

  for (const rejected of rejectedSegments) {
    const alternatives = await searchReplacementCandidates(accessToken, adAccountId, rejected, {
      limit: 6
    });
    hints.push({ rejected, alternatives });

    for (const alt of alternatives) {
      if (seenIds.has(alt.id)) continue;
      seenIds.add(alt.id);
      catalog.push({
        type: alt.type,
        id: alt.id,
        name: alt.name,
        flexBucket: resolveFlexBucket({ itemType: alt.type }),
        replacesRejectedId: rejected.id
      });
    }
  }

  return { catalog, hints };
}

export function formatReplacementHintsForPrompt(hints: ReplacementHint[]): string {
  if (!hints.length) return "";

  const lines = hints.map((hint) => {
    const altText =
      hint.alternatives.length > 0
        ? hint.alternatives.map((a) => `"${a.name}" (${a.type}, id:${a.id})`).join(", ")
        : "nenhuma alternativa encontrada — escolha o mais próximo no catálogo geral";
    return `- REJEITADO: "${hint.rejected.name}" (${hint.rejected.type}, id:${hint.rejected.id}) → substitua por: ${altText}`;
  });

  return [
    "SUBSTITUIÇÕES OBRIGATÓRIAS (segmentos descontinuados pela Meta):",
    ...lines,
    "Não reutilize os IDs rejeitados. Para cada segmento rejeitado, inclua pelo menos uma alternativa válida listada acima (ou equivalente no catálogo)."
  ].join("\n");
}
