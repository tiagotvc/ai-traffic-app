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

export { getAppBaseUrl, getMetaOAuthRedirectUri } from "@/lib/app-url";
