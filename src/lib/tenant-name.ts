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

/** Tenant key: one workspace per Meta gestor; email domain for credenciais. */
export function resolveTenantName(email: string, metaProfileId?: string | null): string {
  const normalized = email.toLowerCase();
  if (isMetaSyntheticEmail(normalized)) {
    const id =
      metaProfileId ??
      normalized.slice(
        "meta-".length,
        normalized.length - `@${META_SYNTHETIC_EMAIL_DOMAIN}`.length
      );
    return `Workspace Meta ${id}`;
  }
  const domain = normalized.split("@")[1] ?? "local";
  return domain === "local" ? "Tenant Local" : `Tenant ${domain}`;
}
