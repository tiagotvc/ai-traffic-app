import createIntlMiddleware from "next-intl/middleware";
import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/auth.config";
import { routing } from "@/i18n/routing";
import { getLocaleFromPath, stripLocale } from "@/lib/locale";
import { isPublicApiPath, isPublicPath } from "@/lib/public-routes";

const intlMiddleware = createIntlMiddleware(routing);
const { auth } = NextAuth(authConfig);

function sessionHasEmail(auth: { user?: { email?: string | null } } | null) {
  const email = auth?.user?.email;
  return typeof email === "string" && email.length > 0;
}

export default auth((req) => {
  const isLoggedIn = sessionHasEmail(req.auth);
  const path = req.nextUrl.pathname;

  if (path.startsWith("/api")) {
    if (!isLoggedIn && !isPublicApiPath(path)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  const locale = getLocaleFromPath(path);
  const pathWithoutLocale = stripLocale(path);

  const isPublic = isPublicPath(pathWithoutLocale);

  if (!isLoggedIn && !isPublic) {
    const login = new URL(`/${locale}/login`, req.nextUrl.origin);
    login.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(login);
  }

  if (isLoggedIn && (pathWithoutLocale === "/" || pathWithoutLocale === "/login")) {
    const switchAccount = req.nextUrl.searchParams.get("switch") === "1";
    if (!switchAccount) {
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, req.nextUrl.origin));
    }
  }

  return intlMiddleware(req);
});

export const config = {
  // Exclude large video upload — middleware body buffering truncates multipart payloads.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/creative-assets/video).*)"]
};
