/** Paths accessible without authentication (without locale prefix). */
export const PUBLIC_MARKETING_PREFIXES = ["/welcome", "/pricing", "/about", "/support"] as const;

export const PUBLIC_LEGAL_PREFIXES = ["/terms", "/privacy", "/data-deletion"] as const;

export function isPublicPath(pathWithoutLocale: string): boolean {
  const path = pathWithoutLocale || "/";
  if (path === "/") return true;
  if (path === "/login" || path.startsWith("/login/")) return true;
  if (path === "/report-print" || path.startsWith("/report-print")) return true;
  // Checkout público: quem clica em "comprar" na landing não deve mais cair no /login — a
  // própria rota cria conta+tenant na hora se não houver sessão (ver /api/billing/checkout).
  if (path === "/billing/checkout" || path.startsWith("/billing/checkout/")) return true;
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
    pathname.startsWith("/api/billing/checkout") ||
    pathname.startsWith("/api/billing/tokenize") ||
    pathname.startsWith("/api/billing/coupons/validate") ||
    pathname.startsWith("/api/billing/installment-simulate") ||
    pathname.startsWith("/api/meta/data-deletion") ||
    // Rotas de cron não têm sessão de usuário (Vercel Cron não manda cookie) — autenticam via
    // CRON_SECRET dentro da própria rota. Sem essa exceção, o middleware bloqueia com 401 antes
    // de a rota sequer checar o secret.
    pathname.startsWith("/api/cron/")
  );
}
