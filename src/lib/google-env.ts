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

/** Scope para integração Google Ads (fase 2). */
export const GOOGLE_ADS_SCOPES = "https://www.googleapis.com/auth/adwords";

export function getGoogleOAuthRedirectUri(): string {
  return `${getAppBaseUrl()}/api/auth/callback/google`;
}

export function getGoogleAdsOAuthRedirectUri(): string {
  return `${getAppBaseUrl()}/api/google/oauth/callback`;
}
