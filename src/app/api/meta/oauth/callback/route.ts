import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import {
  clearMetaOAuthCookies,
  ensureWorkspaceMetaConnectionAfterOAuth,
  exchangeMetaBusinessCode,
  readMetaOAuthCookies
} from "@/lib/meta-business-oauth";
import { resolveRequestOrigin } from "@/lib/app-url";
import { routing } from "@/i18n/routing";

function defaultClientsNewPath(locale?: string) {
  const loc = locale ?? routing.defaultLocale;
  return `/${loc}/clients/new`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const { state: savedState, redirectTo, oauthOrigin } = await readMetaOAuthCookies();
  await clearMetaOAuthCookies();

  const appOrigin = oauthOrigin ?? resolveRequestOrigin(req);
  const fallback = defaultClientsNewPath();

  if (error) {
    const errUrl = new URL(fallback, appOrigin);
    errUrl.searchParams.set("metaError", error);
    return NextResponse.redirect(errUrl.toString());
  }

  if (!code || !state || state !== savedState) {
    const errUrl = new URL(fallback, appOrigin);
    errUrl.searchParams.set("metaError", "invalid_state");
    return NextResponse.redirect(errUrl.toString());
  }

  let userId: string;
  let tenantId: string;
  try {
    const ctx = await getAppContext();
    userId = ctx.user.id;
    tenantId = ctx.tenant.id;
  } catch {
    return NextResponse.redirect(`/login?callbackUrl=${encodeURIComponent(redirectTo ?? fallback)}`);
  }

  const result = await exchangeMetaBusinessCode(code, userId, oauthOrigin);
  if (!result.ok) {
    const errUrl = new URL(fallback, appOrigin);
    errUrl.searchParams.set("metaError", result.error);
    return NextResponse.redirect(errUrl.toString());
  }

  await ensureWorkspaceMetaConnectionAfterOAuth(userId, tenantId);

  const targetPath = redirectTo?.startsWith("/") ? redirectTo : fallback;
  const targetUrl = new URL(targetPath, appOrigin);
  targetUrl.searchParams.set("metaConnected", "1");
  return NextResponse.redirect(targetUrl.toString());
}
