import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { getStoredMetaAccessToken, hasWorkspaceMetaConnected } from "@/lib/meta-auth-store";
import { getAppBaseUrl, listMetaOAuthRedirectUris, resolveRequestOrigin } from "@/lib/app-url";
import { getMetaOAuthRedirectUri, isMetaOAuthConfigured } from "@/lib/meta-env";

export async function GET(req: Request) {
  try {
    const { user, tenant } = await getAppContext();
    const workspaceConnected = await hasWorkspaceMetaConnected(tenant.id);
    const ownStored = await getStoredMetaAccessToken(user.id);
    const requestOrigin = resolveRequestOrigin(req);

    return NextResponse.json({
      ok: true,
      connected: workspaceConnected,
      ownTokenStored: !!ownStored,
      workspaceConnected,
      oauthConfigured: isMetaOAuthConfigured(),
      oauthRedirectUri: getMetaOAuthRedirectUri(requestOrigin),
      appBaseUrl: getAppBaseUrl(),
      requestOrigin,
      redirectUris: listMetaOAuthRedirectUris(requestOrigin)
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
}
