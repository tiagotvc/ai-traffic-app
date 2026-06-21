/** Paths accessible without authentication (without locale prefix). */
export const PUBLIC_MARKETING_PREFIXES = ["/pricing", "/about", "/terms", "/support"] as const;

export function isPublicPath(pathWithoutLocale: string): boolean {
  const path = pathWithoutLocale || "/";
  if (path === "/") return true;
  if (path === "/login" || path.startsWith("/login/")) return true;
  return PUBLIC_MARKETING_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

export function isPublicApiPath(pathname: string): boolean {
  return (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/webhooks/") ||
    pathname.startsWith("/api/billing/plans") ||
    pathname.startsWith("/api/billing/config")
  );
}
