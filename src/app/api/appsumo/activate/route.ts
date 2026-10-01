import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  establishAnonymousSession,
  resolveOrCreateAnonymousTenant
} from "@/lib/billing/anonymous-checkout";
import { linkAppsumoLicenseToTenant } from "@/lib/billing/appsumo/webhook-handler";
import { APPSUMO_LICENSE_COOKIE } from "@/lib/billing/appsumo/cookie";

function formPage(opts: { error?: string } = {}): string {
  const errorHtml = opts.error
    ? `<p style="color:#b91c1c;background:#fef2f2;padding:12px 16px;border-radius:8px;margin:0 0 16px">${opts.error}</p>`
    : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Activate your Orion license</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; background: #0d1520; color: #e2e8f0; display: flex; min-height: 100vh; align-items: center; justify-content: center; margin: 0; }
  main { max-width: 360px; width: 100%; padding: 32px; }
  h1 { font-size: 20px; margin: 0 0 8px; }
  p.sub { color: #94a3b8; font-size: 14px; margin: 0 0 24px; }
  label { display: block; font-size: 13px; margin: 16px 0 6px; color: #cbd5e1; }
  input { width: 100%; box-sizing: border-box; padding: 10px 12px; border-radius: 8px; border: 1px solid #334155; background: #111827; color: #fff; font-size: 14px; }
  button { margin-top: 24px; width: 100%; padding: 12px; border-radius: 8px; border: none; background: #7c3aed; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; }
</style>
</head>
<body>
<main>
  <h1>Activate your AppSumo license</h1>
  <p class="sub">Create your Orion account to finish activating your AppSumo purchase.</p>
  ${errorHtml}
  <form method="POST" action="/api/appsumo/activate">
    <label for="name">Name</label>
    <input id="name" name="name" type="text" required minlength="2">
    <label for="email">Email</label>
    <input id="email" name="email" type="email" required>
    <button type="submit">Activate</button>
  </form>
</main>
</body>
</html>`;
}

export async function GET(req: Request) {
  const jar = await cookies();
  const licenseKey = jar.get(APPSUMO_LICENSE_COOKIE)?.value;
  const hasError = new URL(req.url).searchParams.get("error");

  if (!licenseKey) {
    return new NextResponse(
      formPage({
        error:
          "We couldn't find a pending AppSumo activation. Go back to AppSumo and click Activate on your purchase again."
      }),
      { status: 400, headers: { "Content-Type": "text/html" } }
    );
  }

  return new NextResponse(
    formPage(
      hasError
        ? { error: "Something went wrong reaching AppSumo. Please try activating again." }
        : {}
    ),
    { headers: { "Content-Type": "text/html" } }
  );
}

export async function POST(req: Request) {
  const jar = await cookies();
  const licenseKey = jar.get(APPSUMO_LICENSE_COOKIE)?.value;
  if (!licenseKey) {
    return new NextResponse(
      formPage({
        error:
          "We couldn't find a pending AppSumo activation. Go back to AppSumo and click Activate on your purchase again."
      }),
      { status: 400, headers: { "Content-Type": "text/html" } }
    );
  }

  const form = await req.formData();
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();

  if (name.length < 2 || !email.includes("@")) {
    return new NextResponse(formPage({ error: "Enter a valid name and email." }), {
      status: 400,
      headers: { "Content-Type": "text/html" }
    });
  }

  const resolved = await resolveOrCreateAnonymousTenant(name, email);
  if (resolved.conflict) {
    return new NextResponse(
      formPage({
        error:
          "You already have an Orion account with this email. Log in first, then click Activate on AppSumo again to finish linking your license."
      }),
      { status: 409, headers: { "Content-Type": "text/html" } }
    );
  }

  await linkAppsumoLicenseToTenant(resolved.tenantId, licenseKey);
  await establishAnonymousSession(resolved.userId);
  jar.delete(APPSUMO_LICENSE_COOKIE);

  return NextResponse.redirect(new URL("/en/dashboard?appsumo=connected", req.url));
}
