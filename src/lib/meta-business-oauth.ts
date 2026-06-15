import "server-only";

import { cookies } from "next/headers";
import { randomBytes } from "crypto";

import { META_FACEBOOK_SCOPES } from "@/lib/meta-facebook-provider";
import {
  getMetaAppId,
  getMetaAppSecret,
  getMetaBusinessOAuthConfigId,
  getMetaFacebookLoginConfigId
} from "@/lib/meta-env";
import { getMetaBusinessOAuthRedirectUri } from "@/lib/app-url";
import { persistMetaAuth } from "@/lib/meta-auth-store";

const STATE_COOKIE = "meta_oauth_state";
const REDIRECT_COOKIE = "meta_oauth_redirect";

export function buildMetaBusinessOAuthUrl(state: string): string {
  const configId = getMetaBusinessOAuthConfigId() || getMetaFacebookLoginConfigId();
  const params = new URLSearchParams({
    client_id: getMetaAppId(),
    redirect_uri: getMetaBusinessOAuthRedirectUri(),
    response_type: "code",
    state,
    auth_type: "reauthorize"
  });

  if (configId) {
    params.set("config_id", configId);
    // Scope mínimo para configs Business (Auth.js não participa aqui, mas Meta pode exigir).
    params.set("scope", "pages_show_list");
  } else {
    params.set("scope", META_FACEBOOK_SCOPES);
  }

  return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
}

export async function setMetaOAuthCookies(state: string, redirectTo: string) {
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

export async function readMetaOAuthCookies(): Promise<{
  state: string | null;
  redirectTo: string | null;
}> {
  const jar = await cookies();
  return {
    state: jar.get(STATE_COOKIE)?.value ?? null,
    redirectTo: jar.get(REDIRECT_COOKIE)?.value ?? null
  };
}

export async function clearMetaOAuthCookies() {
  const jar = await cookies();
  jar.delete(STATE_COOKIE);
  jar.delete(REDIRECT_COOKIE);
}

export function createOAuthState(): string {
  return randomBytes(24).toString("hex");
}

export async function exchangeMetaBusinessCode(
  code: string,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const params = new URLSearchParams({
    client_id: getMetaAppId(),
    client_secret: getMetaAppSecret(),
    redirect_uri: getMetaBusinessOAuthRedirectUri(),
    code
  });

  const tokenRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?${params.toString()}`
  );
  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    token_type?: string;
    expires_in?: number;
    error?: { message?: string };
  };

  if (!tokenRes.ok || !tokenJson.access_token) {
    return { ok: false, error: tokenJson.error?.message ?? "Token exchange failed" };
  }

  const expiresAt = tokenJson.expires_in
    ? Math.floor(Date.now() / 1000) + tokenJson.expires_in
    : null;

  await persistMetaAuth(userId, {
    access_token: tokenJson.access_token,
    token_type: tokenJson.token_type ?? null,
    scope: META_FACEBOOK_SCOPES,
    expires_at: expiresAt
  });

  return { ok: true };
}
