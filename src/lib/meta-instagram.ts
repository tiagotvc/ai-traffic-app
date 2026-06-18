/** Instagram actor IDs are numeric Graph node IDs linked to the ad account. */
export function isInstagramActorIdFormat(id: string): boolean {
  return /^\d{5,}$/.test(id.trim());
}

/**
 * Picks an instagram_actor_id safe to send to Meta.
 * Returns null when the ID is missing, malformed, or not linked to the ad account.
 */
export function pickInstagramActorId(
  candidates: Array<string | null | undefined>,
  allowedIds: string[]
): string | null {
  if (!allowedIds.length) return null;

  const allowed = new Set(allowedIds.map((id) => id.trim()).filter(Boolean));
  if (!allowed.size) return null;

  for (const raw of candidates) {
    const id = raw?.trim();
    if (!id || !isInstagramActorIdFormat(id)) continue;
    if (allowed.has(id)) return id;
  }

  return null;
}
