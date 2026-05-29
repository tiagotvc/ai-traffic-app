import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { getStoredMetaAccessToken } from "@/lib/meta-auth-store";
import { getMetaOAuthRedirectUri, isMetaOAuthConfigured } from "@/lib/meta-env";

export async function GET() {
  try {
    const { user, session } = await getAppContext();
    const stored = await getStoredMetaAccessToken(user.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meta = (session as any).meta as { accessToken?: string } | undefined;
    const connected = !!(stored || meta?.accessToken);

    return NextResponse.json({
      ok: true,
      connected,
      oauthConfigured: isMetaOAuthConfigured(),
      oauthRedirectUri: getMetaOAuthRedirectUri()
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
}
