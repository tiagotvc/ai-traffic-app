export type DraftClientOption = { id: string; slug: string; name: string };

/** Match draft `clientSlug` (stored id or legacy slug) to a tenant client row. */
export function resolveDraftClient(
  clientSlug: string | undefined | null,
  clients: DraftClientOption[]
): DraftClientOption | null {
  const key = clientSlug?.trim();
  if (!key || !clients.length) return null;
  return clients.find((c) => c.id === key || c.slug === key) ?? null;
}
