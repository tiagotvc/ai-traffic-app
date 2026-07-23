import { getAppBaseUrl } from "@/lib/app-url";

/** Variáveis Google OAuth (login + futuro Google Ads). */

export function getGoogleClientId(): string {
  return process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
}

export function getGoogleClientSecret(): string {
  return process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "";
}

export function isGoogleOAuthConfigured(): boolean {
  return !!(getGoogleClientId() && getGoogleClientSecret());
}

/** Scope para integração Google Ads. */
export const GOOGLE_ADS_SCOPES = "https://www.googleapis.com/auth/adwords";

export function getGoogleOAuthRedirectUri(): string {
  return `${getAppBaseUrl()}/api/auth/callback/google`;
}

export function getGoogleAdsOAuthRedirectUri(): string {
  return `${getAppBaseUrl()}/api/google/oauth/callback`;
}

/**
 * Developer token da Google Ads API (obrigatório em TODA chamada da API, além do OAuth).
 * Emitido no API Center da conta Manager (MCC). Sem ele nenhuma chamada de ads funciona.
 */
export function getGoogleAdsDeveloperToken(): string {
  return process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim() ?? "";
}

/**
 * ID da conta Manager (MCC) usada no header `login-customer-id`. Só dígitos (sem hífens).
 * Necessário quando o token acessa contas via hierarquia de manager.
 */
export function getGoogleAdsLoginCustomerId(): string {
  return (process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID ?? "").replace(/\D/g, "");
}

/**
 * Kill-switch da integração Google Ads. Default OFF — mantém tudo invisível em produção
 * (revisor da Meta e usuários) até liberarmos explicitamente com GOOGLE_ADS_ENABLED=1.
 */
export function isGoogleAdsEnabled(): boolean {
  return process.env.GOOGLE_ADS_ENABLED?.trim() === "1";
}

/** Credenciais completas para operar a Google Ads API (OAuth + developer token). */
export function isGoogleAdsConfigured(): boolean {
  return isGoogleOAuthConfigured() && !!getGoogleAdsDeveloperToken();
}
