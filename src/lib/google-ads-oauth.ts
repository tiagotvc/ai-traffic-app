import "server-only";

import { cookies } from "next/headers";
import { randomBytes } from "crypto";

import {
  getGoogleAdsOAuthRedirectUri,
  getGoogleClientId,
  getGoogleClientSecret,
  GOOGLE_ADS_SCOPES
} from "@/lib/google-env";
import { persistGoogleAuth } from "@/lib/google-auth-store";

const STATE_COOKIE = "google_oauth_state";
const REDIRECT_COOKIE = "google_oauth_redirect";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export function createGoogleOAuthState(): string {
  return randomBytes(24).toString("hex");
}

/**
 * URL de consent do Google. access_type=offline + prompt=consent garantem refresh_token
 * (necessário porque o access token expira em ~1h). include_granted_scopes preserva scopes
 * já concedidos em conexões anteriores.
 */
export function buildGoogleAdsOAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getGoogleClientId(),
    redirect_uri: getGoogleAdsOAuthRedirectUri(),
    response_type: "code",
    scope: GOOGLE_ADS_SCOPES,
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
    state
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function setGoogleOAuthCookies(state: string, redirectTo: string) {
  const jar = await cookies();
  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 600,
    path: "/"
  };
  jar.set(STATE_COOKIE, state, opts);
  jar.set(REDIRECT_COOKIE, redirectTo, opts);
}

export async function readGoogleOAuthCookies(): Promise<{
  state: string | null;
  redirectTo: string | null;
}> {
  const jar = await cookies();
  return {
    state: jar.get(STATE_COOKIE)?.value ?? null,
    redirectTo: jar.get(REDIRECT_COOKIE)?.value ?? null
  };
}

export async function clearGoogleOAuthCookies() {
  const jar = await cookies();
  jar.delete(STATE_COOKIE);
  jar.delete(REDIRECT_COOKIE);
}

/**
 * Troca o authorization code por tokens (access + refresh) e persiste em google_auth.
 */
export async function exchangeGoogleAdsCode(
  code: string,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: getGoogleClientId(),
    client_secret: getGoogleClientSecret(),
    redirect_uri: getGoogleAdsOAuthRedirectUri(),
    code
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: params.toString()
  });

  const json = (await res.json().catch(() => null)) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    error?: string;
    error_description?: string;
  } | null;

  if (!res.ok || !json?.access_token) {
    return { ok: false, error: json?.error_description ?? json?.error ?? "Token exchange failed" };
  }

  const expiresAt = json.expires_in ? Math.floor(Date.now() / 1000) + json.expires_in : null;

  await persistGoogleAuth(userId, {
    access_token: json.access_token,
    refresh_token: json.refresh_token ?? null,
    scope: json.scope ?? GOOGLE_ADS_SCOPES,
    expires_at: expiresAt
  });

  return { ok: true };
}
