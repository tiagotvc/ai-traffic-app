"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/auth";
import { isMetaOAuthConfigured } from "@/lib/meta-env";
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

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: callbackUrl
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "REGISTER_LOGIN_FAILED" };
    }
    throw err;
  }
  return {};
}

export async function loginWithFacebook(formData: FormData) {
  const locale = String(formData.get("locale") ?? "pt-BR");
  const callbackUrl = String(formData.get("callbackUrl") ?? `/${locale}/onboarding/meta`);
  if (!isMetaOAuthConfigured()) return;
  await signIn("facebook", { redirectTo: callbackUrl });
}
