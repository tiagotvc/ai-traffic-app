"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";

import {
  loginWithCredentials,
  registerWithCredentials,
  type AuthFormState
} from "@/app/[locale]/(auth)/login/actions";
import { SocialLoginButtons } from "@/components/auth/SocialLoginButtons";

const initialState: AuthFormState = {};

export function LoginForm({
  locale,
  callbackUrl,
  googleOAuthConfigured,
  metaOAuthConfigured,
  switchAccount = false,
  currentUserEmail = null,
  accountSuspended = false
}: {
  locale: string;
  callbackUrl: string;
  googleOAuthConfigured: boolean;
  metaOAuthConfigured: boolean;
  switchAccount?: boolean;
  currentUserEmail?: string | null;
  accountSuspended?: boolean;
}) {
  const t = useTranslations("auth");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loginState, loginAction, loginPending] = useActionState(
    loginWithCredentials,
    initialState
  );
  const [registerState, registerAction, registerPending] = useActionState(
    registerWithCredentials,
    initialState
  );

  const error = mode === "login" ? loginState.error : registerState.error;
  const pending = mode === "login" ? loginPending : registerPending;
  const showSwitchBanner = switchAccount && currentUserEmail;
  const hasSocial = googleOAuthConfigured || metaOAuthConfigured;

  return (
    <div className="w-full">
      {showSwitchBanner ? (
        <div className="mb-4 ui-alert-warning px-3 py-2 text-xs">
          <div className="font-semibold">{t("switchAccountTitle")}</div>
          <p className="mt-1">{t("switchAccountBody", { email: currentUserEmail })}</p>
          <p className="mt-2 text-amber-800">{t("switchAccountHint")}</p>
        </div>
      ) : null}

      <div className="flex gap-1 rounded-2xl border border-[var(--border-color)]/80 bg-slate-100/80 p-1 text-xs shadow-inner">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`flex-1 rounded-xl px-3 py-2 font-semibold transition ${
            mode === "login"
              ? "bg-white text-[var(--text-main)] shadow-sm ring-1 ring-slate-200/80"
              : "text-[var(--text-dim)] hover:text-[var(--text-dim)]"
          }`}
        >
          {t("tabLogin")}
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          className={`flex-1 rounded-xl px-3 py-2 font-semibold transition ${
            mode === "register"
              ? "bg-white text-[var(--text-main)] shadow-sm ring-1 ring-slate-200/80"
              : "text-[var(--text-dim)] hover:text-[var(--text-dim)]"
          }`}
        >
          {t("tabRegister")}
        </button>
      </div>

      <div className="mt-6 text-2xl font-heading font-bold tracking-tight text-[var(--text-main)] sm:text-[1.75rem]">
        {mode === "login" ? t("loginTitle") : t("registerTitle")}
      </div>
      <div className="mt-2 text-sm leading-relaxed text-[var(--text-dim)]">
        {mode === "login" ? t("loginSubtitle") : t("registerSubtitle")}
      </div>

      {accountSuspended ? (
        <div className="mt-3 ui-alert-danger px-3 py-2 text-xs">
          {t("errors.ACCOUNT_SUSPENDED")}
        </div>
      ) : null}

      {error ? (
        <div className="mt-3 ui-alert-danger px-3 py-2 text-xs">
          {t(
            error === "EMAIL_TAKEN"
              ? "errors.EMAIL_TAKEN"
              : error === "INVALID_INPUT"
                ? "errors.INVALID_INPUT"
                : error === "REGISTER_LOGIN_FAILED"
                  ? "errors.REGISTER_LOGIN_FAILED"
                  : "errors.INVALID_CREDENTIALS"
          )}
        </div>
      ) : null}

      {hasSocial ? (
        <div className="mt-4">
          <SocialLoginButtons
            locale={locale}
            callbackUrl={callbackUrl}
            googleConfigured={googleOAuthConfigured}
            metaConfigured={metaOAuthConfigured}
          />
          <div className="my-5 flex items-center gap-3 text-xs text-[var(--text-dimmer)]">
            <div className="h-px flex-1 bg-slate-200" />
            {t("orEmail")}
            <div className="h-px flex-1 bg-slate-200" />
          </div>
        </div>
      ) : null}

      {mode === "login" ? (
        <form action={loginAction} className="space-y-3">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          {showSwitchBanner ? <input type="hidden" name="switchAccount" value="1" /> : null}
          <Field label={t("email")} name="email" type="email" autoComplete="email" />
          <Field
            label={t("password")}
            name="password"
            type="password"
            autoComplete="current-password"
          />
          <button
            type="submit"
            disabled={pending}
            className="ui-btn-primary mt-1 w-full py-2.5 text-sm font-semibold disabled:opacity-60"
          >
            {pending ? t("signingIn") : t("signIn")}
          </button>
        </form>
      ) : (
        <form action={registerAction} className="space-y-3">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <Field label={t("name")} name="name" type="text" autoComplete="name" />
          <Field label={t("email")} name="email" type="email" autoComplete="email" />
          <Field
            label={t("password")}
            name="password"
            type="password"
            autoComplete="new-password"
          />
          <p className="text-[11px] text-[var(--text-dim)]">{t("passwordHint")}</p>
          <button
            type="submit"
            disabled={pending}
            className="ui-btn-primary mt-1 w-full py-2.5 text-sm font-semibold disabled:opacity-60"
          >
            {pending ? t("creatingAccount") : t("createAccount")}
          </button>
        </form>
      )}

      <p className="mt-2 text-[11px] text-[var(--text-dimmer)]">{t("metaConnectLaterHint")}</p>
    </div>
  );
}

function Field({
  label,
  name,
  type,
  autoComplete
}: {
  label: string;
  name: string;
  type: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label className="text-xs text-[var(--text-dim)]" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required
        autoComplete={autoComplete}
        className="ui-input mt-1 w-full"
      />
    </div>
  );
}
