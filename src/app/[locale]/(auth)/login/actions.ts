"use server";

import { AuthError } from "next-auth";

import { signIn, signOut } from "@/auth";
import { isGoogleOAuthConfigured } from "@/lib/google-env";
import { buildMetaFacebookLoginAuthParams, isMetaOAuthConfigured } from "@/lib/meta-env";
import { registerUser } from "@/lib/register-user";

export type AuthFormState = {
  error?: string;
};

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

  const result = await registerUser({ email, password, name: name || undefined });
  if (!result.ok) {
    if (result.error === "EMAIL_TAKEN") return { error: "EMAIL_TAKEN" };
    return { error: "INVALID_INPUT" };
  }

  // Marker so the client fires `sign_up` / Meta CompleteRegistration once on landing
  // (see [[src/components/analytics/ConversionBeacon.tsx]]).
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

export async function loginWithGoogle(formData: FormData) {
  const locale = String(formData.get("locale") ?? "pt-BR");
  const callbackUrl = String(formData.get("callbackUrl") ?? `/${locale}/dashboard`);
  if (!isGoogleOAuthConfigured()) return;

  await signOut({ redirect: false });

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
