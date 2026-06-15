import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { GOOGLE_ADS_SCOPES, isGoogleOAuthConfigured } from "@/lib/google-env";
import { getAppBaseUrl } from "@/lib/app-url";

/**
 * Stub Google Ads OAuth — redireciona para consent screen quando configurado.
 * Integração completa de campanhas/métricas virá na fase 2.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const redirectTo = url.searchParams.get("redirectTo") ?? "/onboarding/connect";

  if (!isGoogleOAuthConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: "Configure GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET",
        scopes: GOOGLE_ADS_SCOPES
      },
      { status: 503 }
    );
  }

  try {
    await getAppContext();
  } catch {
    return NextResponse.redirect(
      `${getAppBaseUrl()}/login?callbackUrl=${encodeURIComponent(redirectTo)}`
    );
  }

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!.trim(),
    redirect_uri: `${getAppBaseUrl()}/api/google/oauth/callback`,
    response_type: "code",
    scope: GOOGLE_ADS_SCOPES,
    access_type: "offline",
    prompt: "consent",
    state: Buffer.from(JSON.stringify({ redirectTo })).toString("base64url")
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
