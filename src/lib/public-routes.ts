/** Paths accessible without authentication (without locale prefix). */
export const PUBLIC_MARKETING_PREFIXES = ["/welcome", "/pricing", "/about", "/support"] as const;

export const PUBLIC_LEGAL_PREFIXES = ["/terms", "/privacy", "/data-deletion"] as const;

export function isPublicPath(pathWithoutLocale: string): boolean {
  const path = pathWithoutLocale || "/";
  if (path === "/") return true;
  if (path === "/login" || path.startsWith("/login/")) return true;
  if (path === "/report-print" || path.startsWith("/report-print")) return true;
  const publicPrefixes = [...PUBLIC_MARKETING_PREFIXES, ...PUBLIC_LEGAL_PREFIXES];
  return publicPrefixes.some((p) => path === p || path.startsWith(`${p}/`));
}

export function isPublicApiPath(pathname: string): boolean {
  return (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/webhooks/") ||
    pathname.startsWith("/api/billing/plans") ||
    pathname.startsWith("/api/billing/config") ||
    pathname.startsWith("/api/meta/data-deletion")
  );
}
