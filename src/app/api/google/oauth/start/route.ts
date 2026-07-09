import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { isGoogleAdsEnabled, isGoogleOAuthConfigured } from "@/lib/google-env";
import {
  buildGoogleAdsOAuthUrl,
  createGoogleOAuthState,
  setGoogleOAuthCookies
} from "@/lib/google-ads-oauth";
import { getAppBaseUrl } from "@/lib/app-url";

/**
 * Início do OAuth Google Ads. Gated pelo kill-switch (GOOGLE_ADS_ENABLED) — enquanto
 * desligado, responde 404 para não expor a integração em produção.
 */
export async function GET(req: Request) {
  if (!isGoogleAdsEnabled()) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  // OAuth só precisa de client id + secret. O developer token é exigido depois,
  // apenas nas chamadas à API (ex.: listar contas em /api/google-ads/accounts).
  if (!isGoogleOAuthConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Google OAuth not configured" },
      { status: 503 }
    );
  }

  const url = new URL(req.url);
  const redirectTo = url.searchParams.get("redirectTo") ?? "/settings?tab=integrations";

  try {
    await getAppContext();
  } catch {
    return NextResponse.redirect(
      `${getAppBaseUrl()}/login?callbackUrl=${encodeURIComponent(redirectTo)}`
    );
  }

  const state = createGoogleOAuthState();
  await setGoogleOAuthCookies(state, redirectTo);

  return NextResponse.redirect(buildGoogleAdsOAuthUrl(state));
}
