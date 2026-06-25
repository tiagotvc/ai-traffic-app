import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import {
  clearMetaOAuthCookies,
  ensureWorkspaceMetaConnectionAfterOAuth,
  exchangeMetaBusinessCode,
  readMetaOAuthCookies
} from "@/lib/meta-business-oauth";
import { resolveRequestOrigin } from "@/lib/app-url";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const { state: savedState, redirectTo, oauthOrigin } = await readMetaOAuthCookies();
  await clearMetaOAuthCookies();

  const appOrigin = oauthOrigin ?? resolveRequestOrigin(req);
  const fallback = `${appOrigin}/onboarding/meta/setup`;

  if (error) {
    return NextResponse.redirect(
      `${fallback}?metaError=${encodeURIComponent(error)}`
    );
  }

  if (!code || !state || state !== savedState) {
    return NextResponse.redirect(`${fallback}?metaError=invalid_state`);
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
    return NextResponse.redirect(
      `${fallback}?metaError=${encodeURIComponent(result.error)}`
    );
  }

  await ensureWorkspaceMetaConnectionAfterOAuth(userId, tenantId);

  const target = redirectTo?.startsWith("/") ? redirectTo : fallback;
  return NextResponse.redirect(`${appOrigin}${target}?metaConnected=1`);
}
