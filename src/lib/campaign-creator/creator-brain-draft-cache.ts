import "server-only";

import type { ResearchSection } from "@/lib/labs/pipelines/types";

/**
 * Draft-scoped research cache (Phase C foundation).
 * TODO: persist to `creator_brain_research` table keyed by draftId + clientId + scientistId.
 * Today: in-memory + optional Redis via market-research-cache pattern when wired.
 */
const mem = new Map<string, { section: ResearchSection; exp: number }>();
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function draftResearchCacheKey(
  draftId: string,
  clientId: string,
  scientistId: string
): string {
  return `creator-brain-draft:${draftId}:${clientId}:${scientistId}`;
}

export async function getDraftResearchSection(key: string): Promise<ResearchSection | null> {
  const hit = mem.get(key);
  if (!hit) return null;
  if (hit.exp < Date.now()) {
    mem.delete(key);
    return null;
  }
  return hit.section;
}

export async function setDraftResearchSection(key: string, section: ResearchSection): Promise<void> {
  mem.set(key, { section, exp: Date.now() + TTL_MS });
}

export async function getDraftResearchSections(
  draftId: string,
  clientId: string
): Promise<ResearchSection[]> {
  const prefix = `creator-brain-draft:${draftId}:${clientId}:`;
  const out: ResearchSection[] = [];
  const now = Date.now();
  for (const [key, hit] of mem) {
    if (!key.startsWith(prefix)) continue;
    if (hit.exp < now) {
      mem.delete(key);
      continue;
    }
    out.push(hit.section);
  }
  return out;
}
