import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { exchangeAppsumoCode, fetchAppsumoLicenseKey } from "@/lib/billing/appsumo/client";
import { linkAppsumoLicenseToTenant } from "@/lib/billing/appsumo/webhook-handler";
import { getTenantContextSlim } from "@/lib/app-shell-context";
import { APPSUMO_LICENSE_COOKIE } from "@/lib/billing/appsumo/cookie";

/**
 * OAuth Redirect URL registered in the AppSumo Partner Portal.
 *
 * Two very different callers hit this route:
 * 1. The Partner Portal's own validation ping — a bare GET with no `code`. Must return 200.
 * 2. A real buyer after granting access — carries `?code=`, which we exchange for the
 *    license_key (steps 2-3 of the OAuth flow). If they already have a session we link the
 *    license immediately; otherwise we stash the license_key in a short-lived cookie and send
 *    them to the activation form, since AppSumo never sends us an email to sign them up with.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return new NextResponse("OK", { status: 200 });
  }

  try {
    const token = await exchangeAppsumoCode(code);
    const license = await fetchAppsumoLicenseKey(token.access_token);

    try {
      const { tenant } = await getTenantContextSlim();
      await linkAppsumoLicenseToTenant(tenant.id, license.license_key);
      return NextResponse.redirect(new URL("/en/dashboard?appsumo=connected", url.origin));
    } catch {
      // Not authenticated — collect name/email on our side, since AppSumo doesn't pass one.
      const jar = await cookies();
      jar.set(APPSUMO_LICENSE_COOKIE, license.license_key, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60,
        path: "/api/appsumo"
      });
      return NextResponse.redirect(new URL("/api/appsumo/activate", url.origin));
    }
  } catch (err) {
    console.error("[appsumo/callback]", err);
    return NextResponse.redirect(new URL("/api/appsumo/activate?error=1", url.origin));
  }
}
