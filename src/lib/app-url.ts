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

export function getAsaasWebhookUrl(): string {
  return `${getAppBaseUrl()}/api/webhooks/asaas`;
}

export function getMetaFacebookLoginRedirectUri(): string {
  return `${getAppBaseUrl()}/api/auth/callback/facebook-login`;
}

/** URI de redirect para exibir em settings (login + conectar Meta). */
export function getMetaOAuthRedirectUri(): string {
  return getMetaBusinessOAuthRedirectUri();
}

export function getMetaBusinessOAuthRedirectUri(): string {
  return `${getAppBaseUrl()}/api/meta/oauth/callback`;
}

export function getStripeWebhookUrl(): string {
  return `${getAppBaseUrl()}/api/webhooks/stripe`;
}
