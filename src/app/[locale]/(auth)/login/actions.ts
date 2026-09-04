"use server";

import { AuthError } from "next-auth";

import { signIn, signOut } from "@/auth";
import { isGoogleOAuthConfigured } from "@/lib/google-env";
import { buildMetaFacebookLoginAuthParams, isMetaOAuthConfigured } from "@/lib/meta-env";
import { registerUser } from "@/lib/register-user";
import { ATTRIBUTION_PARAMS, type Attribution } from "@/lib/analytics/attribution";
import { onUserSignedUp } from "@/lib/analytics/signup-events";
import { hasServerAnalyticsConsent, readMetaBrowserCookies } from "@/lib/server-consent";
import {
  looksGeneratedName,
  recordBlockedSignup,
  requestIp,
  signupRateLimited,
  verifyTurnstile
} from "@/lib/signup-abuse";

export type AuthFormState = {
  error?: string;
};

/**
 * Lê a atribuição de campanha dos campos escondidos do formulário — ela veio pela
 * URL do anúncio até aqui, sem nunca ser gravada no dispositivo (ver
 * [[src/lib/analytics/attribution.ts]] para o porquê).
 */
function readAttributionFromForm(formData: FormData): Attribution {
  const out: Attribution = {};
  for (const key of ATTRIBUTION_PARAMS) {
    const value = String(formData.get(key) ?? "").trim();
    if (value) out[key] = value.slice(0, 255);
  }
  return out;
}

export async function loginWithCredentials(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const locale = String(formData.get("locale") ?? "pt-BR");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const callbackUrl = String(formData.get("callbackUrl") ?? `/${locale}/dashboard`);
  const switchAccount = formData.get("switchAccount") === "1";

  if (switchAccount) {
    await signOut({ redirect: false });
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: callbackUrl
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "INVALID_CREDENTIALS" };
    }
    throw err;
  }
  return {};
}

export async function registerWithCredentials(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const locale = String(formData.get("locale") ?? "pt-BR");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "");
  const callbackUrl = String(formData.get("callbackUrl") ?? `/${locale}/dashboard`);
  const honeypot = String(formData.get("companyWebsite") ?? "");
  const turnstileToken = String(formData.get("cf-turnstile-response") ?? "");

  const { headers } = await import("next/headers");
  const h = await headers();
  const ip = requestIp(h);
  const blockReason = honeypot
    ? ("honeypot" as const)
    : looksGeneratedName(name)
      ? ("suspicious_name" as const)
      : await signupRateLimited(ip, email)
        ? ("rate_limited" as const)
        : !(await verifyTurnstile(turnstileToken, ip))
          ? ("captcha_failed" as const)
          : null;
  if (blockReason) {
    await recordBlockedSignup(blockReason, ip, email);
    return {
      error: blockReason === "rate_limited" ? "RATE_LIMITED" : "SIGNUP_VERIFICATION_FAILED"
    };
  }

  const attribution = readAttributionFromForm(formData);
  const consented = await hasServerAnalyticsConsent();

  const result = await registerUser({
    email,
    password,
    name: name || undefined,
    attribution,
    analyticsConsent: consented ? "accepted" : "rejected"
  });
  if (!result.ok) {
    if (result.error === "EMAIL_TAKEN") return { error: "EMAIL_TAKEN" };
    return { error: "INVALID_INPUT" };
  }

  // Precisa vir ANTES do signIn: `redirectTo` lança NEXT_REDIRECT e nada depois roda.
  // Conta-fantasma ganhando senha não é cadastro novo — não conta como conversão.
  if (result.isNewUser) {
    const metaCookies = await readMetaBrowserCookies();
    const { user: userRepo } = await (await import("@/db/repositories")).repositories();
    const created = await userRepo.findOne({ where: { id: result.userId } });

    await onUserSignedUp({
      userId: result.userId,
      email,
      name: name || null,
      tenantId: created?.tenantId ?? "",
      method: "email",
      attribution,
      hasAnalyticsConsent: consented,
      ...metaCookies,
      clientIpAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim(),
      clientUserAgent: h.get("user-agent") ?? undefined
    });
  }

  // Marker so the client fires the GA4 `sign_up` once on landing
  // (see [[src/components/analytics/ConversionBeacon.tsx]]). O evento da Meta já
  // saiu pelo servidor acima — o navegador não repete.
  const signupRedirect = callbackUrl.includes("?")
    ? `${callbackUrl}&signup=1`
    : `${callbackUrl}?signup=1`;

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: signupRedirect
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "REGISTER_LOGIN_FAILED" };
    }
    throw err;
  }
  return {};
}

/**
 * Guarda a origem antes do redirect do provedor — é a única forma de ela sobreviver
 * ao ida-e-volta do OAuth. Só grava com consentimento (ver oauth-attribution).
 */
async function persistAttributionForOAuth(formData: FormData) {
  if (!(await hasServerAnalyticsConsent())) return;
  const attribution = readAttributionFromForm(formData);
  if (!Object.keys(attribution).length) return;
  const { storePendingAttribution } = await import("@/lib/analytics/oauth-attribution");
  await storePendingAttribution(attribution);
}

export async function loginWithGoogle(formData: FormData) {
  const locale = String(formData.get("locale") ?? "pt-BR");
  const callbackUrl = String(formData.get("callbackUrl") ?? `/${locale}/dashboard`);
  if (!isGoogleOAuthConfigured()) return;

  await signOut({ redirect: false });
  await persistAttributionForOAuth(formData);

  await signIn("google", { redirectTo: callbackUrl });
}

export async function loginWithFacebook(formData: FormData) {
  const locale = String(formData.get("locale") ?? "pt-BR");
  const callbackUrl = String(formData.get("callbackUrl") ?? `/${locale}/dashboard`);
  if (!isMetaOAuthConfigured()) {
    const { redirect } = await import("next/navigation");
    redirect(`/${locale}/login?error=meta_not_configured`);
  }

  await signOut({ redirect: false });
  await persistAttributionForOAuth(formData);

  await signIn("facebook-login", {
    redirectTo: callbackUrl,
    authorizationParams: {
      ...buildMetaFacebookLoginAuthParams(),
      auth_type: "reauthenticate"
    }
  });
}

export async function redirectToMetaBusinessOAuth(formData: FormData) {
  const locale = String(formData.get("locale") ?? "pt-BR");
  const redirectTo = String(
    formData.get("redirectTo") ?? `/${locale}/onboarding/meta/setup`
  );
  const { redirect } = await import("next/navigation");
  redirect(`/api/meta/oauth/start?redirectTo=${encodeURIComponent(redirectTo)}`);
}
