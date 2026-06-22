import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  buildMetaBusinessOAuthUrl,
  createOAuthState,
  setMetaOAuthCookies
} from "@/lib/meta-business-oauth";
import { resolveRequestOrigin } from "@/lib/app-url";
import { isMetaOAuthConfigured } from "@/lib/meta-env";

export async function GET(req: Request) {
  if (!isMetaOAuthConfigured()) {
    return NextResponse.json({ ok: false, error: "Meta OAuth not configured" }, { status: 503 });
  }

  const session = await auth();
  if (!session?.user?.email) {
    const url = new URL(req.url);
    const redirectTo = url.searchParams.get("redirectTo") ?? "/";
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${encodeURIComponent(redirectTo)}`, req.url)
    );
  }

  const url = new URL(req.url);
  const redirectTo = url.searchParams.get("redirectTo") ?? "/onboarding/meta/setup";
  const oauthOrigin = resolveRequestOrigin(req);
  const state = createOAuthState();
  await setMetaOAuthCookies(state, redirectTo, oauthOrigin);

  return NextResponse.redirect(buildMetaBusinessOAuthUrl(state, oauthOrigin));
}
