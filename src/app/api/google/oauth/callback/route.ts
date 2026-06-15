import { NextResponse } from "next/server";

import { getAppBaseUrl } from "@/lib/app-url";

/** Callback stub — persiste token Google Ads na fase 2. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const error = url.searchParams.get("error");
  let redirectTo = "/onboarding/connect";

  try {
    const stateRaw = url.searchParams.get("state");
    if (stateRaw) {
      const parsed = JSON.parse(Buffer.from(stateRaw, "base64url").toString()) as {
        redirectTo?: string;
      };
      if (parsed.redirectTo?.startsWith("/")) redirectTo = parsed.redirectTo;
    }
  } catch {
    /* ignore */
  }

  const base = getAppBaseUrl();
  if (error) {
    return NextResponse.redirect(`${base}${redirectTo}?googleError=${encodeURIComponent(error)}`);
  }

  return NextResponse.redirect(`${base}${redirectTo}?googleAds=coming_soon`);
}
