/** Variáveis Meta usadas no servidor (não expor secret ao cliente). */

export function getMetaAppId(): string {
  return process.env.META_APP_ID?.trim() ?? "";
}

export function getMetaAppSecret(): string {
  return process.env.META_APP_SECRET?.trim() ?? "";
}

export function isMetaOAuthConfigured(): boolean {
  return !!(getMetaAppId() && getMetaAppSecret());
}

export function getMetaOAuthRedirectUri(): string {
  const base = process.env.AUTH_URL?.trim() || process.env.NEXTAUTH_URL?.trim() || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/auth/callback/facebook`;
}
