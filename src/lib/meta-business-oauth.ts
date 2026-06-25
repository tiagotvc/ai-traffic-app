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
import { fetchMyPermissions } from "@/lib/meta-graph";
import { persistMetaAuth } from "@/lib/meta-auth-store";
import { repositories } from "@/db/repositories";

const STATE_COOKIE = "meta_oauth_state";
const REDIRECT_COOKIE = "meta_oauth_redirect";
const ORIGIN_COOKIE = "meta_oauth_origin";

export function buildMetaBusinessOAuthUrl(state: string, origin?: string): string {
  const configId = getMetaBusinessOAuthConfigId() || getMetaFacebookLoginConfigId();
  const params = new URLSearchParams({
    client_id: getMetaAppId(),
    redirect_uri: getMetaBusinessOAuthRedirectUri(origin),
    response_type: "code",
    state,
    auth_type: "reauthorize"
  });

  if (configId) {
    params.set("config_id", configId);
  }
  // Sempre solicitar scopes de Marketing API no fluxo "Reconectar Meta".
  // Antes só pages_show_list era enviado com config_id — gerava erro #200 na conta.
  params.set("scope", META_FACEBOOK_SCOPES);

  return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
}

export async function setMetaOAuthCookies(
  state: string,
  redirectTo: string,
  oauthOrigin?: string
) {
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
  if (oauthOrigin?.trim()) {
    jar.set(ORIGIN_COOKIE, oauthOrigin.replace(/\/$/, ""), opts);
  }
}

export async function readMetaOAuthCookies(): Promise<{
  state: string | null;
  redirectTo: string | null;
  oauthOrigin: string | null;
}> {
  const jar = await cookies();
  return {
    state: jar.get(STATE_COOKIE)?.value ?? null,
    redirectTo: jar.get(REDIRECT_COOKIE)?.value ?? null,
    oauthOrigin: jar.get(ORIGIN_COOKIE)?.value ?? null
  };
}

export async function clearMetaOAuthCookies() {
  const jar = await cookies();
  jar.delete(STATE_COOKIE);
  jar.delete(REDIRECT_COOKIE);
  jar.delete(ORIGIN_COOKIE);
}

export function createOAuthState(): string {
  return randomBytes(24).toString("hex");
}

async function exchangeForLongLivedToken(shortLived: string): Promise<{
  access_token: string;
  expires_in?: number;
}> {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: getMetaAppId(),
    client_secret: getMetaAppSecret(),
    fb_exchange_token: shortLived
  });
  const res = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?${params.toString()}`);
  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: { message?: string };
  };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error?.message ?? "Long-lived token exchange failed");
  }
  return { access_token: json.access_token, expires_in: json.expires_in };
}

/** Garante que só o responsável oficial (ou o 1º admin) vira conexão do workspace. */
export async function ensureWorkspaceMetaConnectionAfterOAuth(
  userId: string,
  tenantId: string
): Promise<void> {
  const { tenant: tenantRepo, tenantMember: memberRepo } = await repositories();
  const tenant = await tenantRepo.findOne({ where: { id: tenantId } });
  if (!tenant) return;

  const member = await memberRepo.findOne({ where: { tenantId, userId } });
  if (member?.role === "member") return;

  if (tenant.metaConnectionUserId === userId) return;

  if (!tenant.metaConnectionUserId) {
    tenant.metaConnectionUserId = userId;
    await tenantRepo.save(tenant);
  }
}

export async function exchangeMetaBusinessCode(
  code: string,
  userId: string,
  oauthOrigin?: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  const params = new URLSearchParams({
    client_id: getMetaAppId(),
    client_secret: getMetaAppSecret(),
    redirect_uri: getMetaBusinessOAuthRedirectUri(oauthOrigin ?? undefined),
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

  let accessToken = tokenJson.access_token;
  let expiresIn = tokenJson.expires_in;
  try {
    const longLived = await exchangeForLongLivedToken(accessToken);
    accessToken = longLived.access_token;
    expiresIn = longLived.expires_in ?? expiresIn;
  } catch {
    if (process.env.NODE_ENV === "production") {
      return {
        ok: false,
        error:
          "Não foi possível obter um token de longa duração da Meta. Tente reconectar em alguns minutos."
      };
    }
  }

  const expiresAt = expiresIn
    ? Math.floor(Date.now() / 1000) + expiresIn
    : Math.floor(Date.now() / 1000) + 60 * 24 * 60 * 60;

  await persistMetaAuth(userId, {
    access_token: accessToken,
    token_type: tokenJson.token_type ?? null,
    scope: META_FACEBOOK_SCOPES,
    expires_at: expiresAt
  });

  try {
    const perms = await fetchMyPermissions(accessToken);
    const granted = new Set(
      perms.filter((p) => p.status === "granted").map((p) => p.permission)
    );
    const required = ["ads_read", "ads_management"] as const;
    const missing = required.filter((p) => !granted.has(p));
    if (missing.length) {
      return {
        ok: false,
        error:
          `Permissões de anúncios não concedidas (${missing.join(", ")}). ` +
          "Ao reconectar, marque todas as permissões solicitadas e selecione as contas de anúncios no diálogo da Meta."
      };
    }
  } catch {
    // Em dev a checagem pode falhar; o token já foi salvo.
  }

  return { ok: true };
}
