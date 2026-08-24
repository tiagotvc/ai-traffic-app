import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { isDemoWorkspace } from "@/lib/demo-data";
import { getStoredMetaAccessToken, hasWorkspaceMetaConnected } from "@/lib/meta-auth-store";
import { getAppBaseUrl, listMetaOAuthRedirectUris, resolveRequestOrigin } from "@/lib/app-url";
import { getMetaOAuthRedirectUri, isMetaOAuthConfigured } from "@/lib/meta-env";

export async function GET(req: Request) {
  try {
    const { user, tenant } = await getAppContext();
    const realConnected = await hasWorkspaceMetaConnected(tenant.id);
    // Workspace de demonstração não tem o que conectar: as telas leem o banco.
    const demoWorkspace = !realConnected && (await isDemoWorkspace(tenant.id));
    const workspaceConnected = realConnected || demoWorkspace;
    const ownStored = await getStoredMetaAccessToken(user.id);
    const requestOrigin = resolveRequestOrigin(req);

    return NextResponse.json({
      ok: true,
      connected: workspaceConnected,
      ownTokenStored: !!ownStored,
      workspaceConnected,
      demoWorkspace,
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
