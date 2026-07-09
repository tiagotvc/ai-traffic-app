import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { hasGoogleAdsConnected } from "@/lib/google-auth-store";
import { getAppBaseUrl } from "@/lib/app-url";
import {
  getGoogleAdsOAuthRedirectUri,
  isGoogleAdsConfigured,
  isGoogleAdsEnabled
} from "@/lib/google-env";

/** Status da conexão Google Ads do usuário atual (para a aba de integrações). */
export async function GET() {
  if (!isGoogleAdsEnabled()) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  try {
    const { user } = await getAppContext();
    const connected = await hasGoogleAdsConnected(user.id);

    return NextResponse.json({
      ok: true,
      connected,
      oauthConfigured: isGoogleAdsConfigured(),
      oauthRedirectUri: getGoogleAdsOAuthRedirectUri(),
      appBaseUrl: getAppBaseUrl()
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
}
