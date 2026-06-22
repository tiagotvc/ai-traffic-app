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

/** Origem real da requisição (domínio que o usuário está usando no browser). */
export function resolveRequestOrigin(req: Request): string {
  const forwardedHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (forwardedHost) {
    const proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
    return `${proto}://${forwardedHost}`;
  }

  return new URL(req.url).origin;
}

function oauthBaseUrl(origin?: string): string {
  if (origin?.trim()) return origin.replace(/\/$/, "");
  const envOverride = process.env.META_OAUTH_REDIRECT_BASE_URL?.trim();
  if (envOverride) return envOverride.replace(/\/$/, "");
  return getAppBaseUrl();
}

export function getAsaasWebhookUrl(): string {
  return `${getAppBaseUrl()}/api/webhooks/asaas`;
}

export function getMetaFacebookLoginRedirectUri(origin?: string): string {
  return `${oauthBaseUrl(origin)}/api/auth/callback/facebook-login`;
}

/** URI de redirect para exibir em settings (login + conectar Meta). */
export function getMetaOAuthRedirectUri(origin?: string): string {
  return getMetaBusinessOAuthRedirectUri(origin);
}

export function getMetaBusinessOAuthRedirectUri(origin?: string): string {
  return `${oauthBaseUrl(origin)}/api/meta/oauth/callback`;
}

/** URLs que devem estar liberadas no app Meta (env + origem atual). */
export function listMetaOAuthRedirectUris(requestOrigin?: string): string[] {
  const bases = new Set<string>([getAppBaseUrl()]);
  if (requestOrigin?.trim()) bases.add(requestOrigin.replace(/\/$/, ""));
  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProd) bases.add(`https://${vercelProd.replace(/^https?:\/\//, "")}`);
  return [...bases].flatMap((base) => [
    `${base}/api/meta/oauth/callback`,
    `${base}/api/auth/callback/facebook-login`
  ]);
}

export function getStripeWebhookUrl(): string {
  return `${getAppBaseUrl()}/api/webhooks/stripe`;
}
