/**
 * URL pública do app (OAuth, links absolutos).
 * Em produção na Vercel, ignora localhost do .env e usa VERCEL_URL.
 */
export function getAppBaseUrl(): string {
  const explicit = (process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "").trim();

  if (explicit && !(process.env.NODE_ENV === "production" && explicit.includes("localhost"))) {
    return explicit.replace(/\/$/, "");
  }

  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProd) {
    return `https://${vercelProd.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return `https://${vercelUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  }

  const port = process.env.PORT?.trim() || "3008";
  return `http://localhost:${port}`;
}

export function getMetaOAuthRedirectUri(): string {
  return `${getAppBaseUrl()}/api/auth/callback/facebook`;
}
