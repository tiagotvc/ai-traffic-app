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

/** Config ID — Facebook Login for Business → Configurações (login de identidade). */
export function getMetaFacebookLoginConfigId(): string {
  return process.env.META_FACEBOOK_LOGIN_CONFIG_ID?.trim() ?? "";
}

/** Config ID — fluxo Conectar Meta / ads (pode ser outra config com scopes de ads). */
export function getMetaBusinessOAuthConfigId(): string {
  return process.env.META_BUSINESS_OAUTH_CONFIG_ID?.trim() ?? "";
}

/**
 * Scopes do login de identidade quando não há config_id.
 * Business Login exige permissão de negócio além de public_profile (ex.: pages_show_list).
 * Não use email — apps de ads rejeitam.
 */
export function getMetaFacebookLoginScopes(): string {
  const custom = process.env.META_FACEBOOK_LOGIN_SCOPES?.trim();
  if (custom) return custom;
  return "pages_show_list";
}

/** Params OAuth do login Facebook (config_id + scope evita Auth.js injetar openid/profile/email). */
export function buildMetaFacebookLoginAuthParams(): Record<string, string> {
  const scope = getMetaFacebookLoginScopes();
  const configId = getMetaFacebookLoginConfigId();
  const params: Record<string, string> = { scope };
  if (configId) params.config_id = configId;
  return params;
}

export { getAppBaseUrl, getMetaFacebookLoginRedirectUri, getMetaOAuthRedirectUri, listMetaOAuthRedirectUris } from "@/lib/app-url";
