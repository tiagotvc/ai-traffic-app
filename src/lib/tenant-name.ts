export const META_SYNTHETIC_EMAIL_DOMAIN = "traffic-ai.local";

export function metaEmailFromProfileId(profileId: string): string {
  return `meta-${profileId}@${META_SYNTHETIC_EMAIL_DOMAIN}`;
}

export function isMetaSyntheticEmail(email: string): boolean {
  const normalized = email.toLowerCase();
  return (
    normalized.startsWith("meta-") &&
    normalized.endsWith(`@${META_SYNTHETIC_EMAIL_DOMAIN}`)
  );
}

/**
 * Human-readable name for a personal workspace.
 *
 * This must include the complete account identity. Using only the email domain
 * (for example, `Tenant gmail.com`) caused unrelated users to share a tenant.
 * The name is display metadata only and must never be used to find/reuse a
 * workspace during signup.
 */
export function resolveTenantName(email: string, metaProfileId?: string | null): string {
  const normalized = email.toLowerCase().trim();
  if (isMetaSyntheticEmail(normalized)) {
    const id =
      metaProfileId ??
      normalized.slice(
        "meta-".length,
        normalized.length - `@${META_SYNTHETIC_EMAIL_DOMAIN}`.length
      );
    return `Workspace Meta ${id}`;
  }
  return `Workspace ${normalized}`;
}
