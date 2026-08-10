/**
 * Normalização das tags livres de personas.
 *
 * Sem isso "Beleza", "beleza " e "BELEZA" viram três tags distintas na
 * biblioteca — que é justamente a bagunça que as tags deveriam resolver.
 */

export const MAX_TAG_LENGTH = 40;
export const MAX_TAGS_PER_PERSONA = 8;

/** Minúsculas, sem espaços nas pontas, espaços internos viram hífen. */
export function normalizeTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, MAX_TAG_LENGTH);
}

/** Normaliza, remove vazias e duplicadas (preservando a ordem) e limita a quantidade. */
export function normalizeTags(raw: readonly string[] | null | undefined): string[] {
  if (!raw?.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const tag = normalizeTag(item);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
    if (out.length >= MAX_TAGS_PER_PERSONA) break;
  }
  return out;
}
