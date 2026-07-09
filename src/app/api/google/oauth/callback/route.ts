import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { getAppBaseUrl } from "@/lib/app-url";
import { isGoogleAdsEnabled } from "@/lib/google-env";
import {
  clearGoogleOAuthCookies,
  exchangeGoogleAdsCode,
  readGoogleOAuthCookies
} from "@/lib/google-ads-oauth";

const FALLBACK = "/settings?tab=integrations";

/** Monta a URL de retorno preservando query params já existentes no destino. */
function redirectWithParam(base: string, target: string, key: string, value: string) {
  const url = new URL(target, base);
  url.searchParams.set(key, value);
  return NextResponse.redirect(url.toString());
}

/** Callback do OAuth Google Ads: valida state, troca o code e persiste os tokens. */
export async function GET(req: Request) {
  const base = getAppBaseUrl();

  if (!isGoogleAdsEnabled()) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const { state: savedState, redirectTo } = await readGoogleOAuthCookies();
  await clearGoogleOAuthCookies();

  const target = redirectTo?.startsWith("/") ? redirectTo : FALLBACK;

  if (error) {
    return redirectWithParam(base, target, "googleError", error);
  }

  if (!code || !state || state !== savedState) {
    return redirectWithParam(base, target, "googleError", "invalid_state");
  }

  let userId: string;
  try {
    const ctx = await getAppContext();
    userId = ctx.user.id;
  } catch {
    return NextResponse.redirect(
      `${base}/login?callbackUrl=${encodeURIComponent(target)}`
    );
  }

  const result = await exchangeGoogleAdsCode(code, userId);
  if (!result.ok) {
    return redirectWithParam(base, target, "googleError", result.error);
  }

  return redirectWithParam(base, target, "googleConnected", "1");
}
