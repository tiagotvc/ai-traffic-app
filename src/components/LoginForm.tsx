"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";

import {
  loginWithCredentials,
  loginWithFacebook,
  registerWithCredentials,
  type AuthFormState
} from "@/app/[locale]/(auth)/login/actions";

const initialState: AuthFormState = {};

export function LoginForm({
  locale,
  callbackUrl,
  metaOAuthConfigured,
  switchAccount = false,
  currentUserEmail = null
}: {
  locale: string;
  callbackUrl: string;
  metaOAuthConfigured: boolean;
  switchAccount?: boolean;
  currentUserEmail?: string | null;
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

  return (
    <div className="ui-card p-6 shadow-cardHover">
      {showSwitchBanner ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <div className="font-semibold">{t("switchAccountTitle")}</div>
          <p className="mt-1">{t("switchAccountBody", { email: currentUserEmail })}</p>
          <p className="mt-2 text-amber-800">{t("switchAccountHint")}</p>
        </div>
      ) : null}

      <div className="flex gap-1 rounded-xl border border-surface-line bg-slate-50 p-1 text-xs">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`flex-1 rounded-lg px-2 py-1.5 font-medium ${
            mode === "login" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
          }`}
        >
          {t("tabLogin")}
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          className={`flex-1 rounded-lg px-2 py-1.5 font-medium ${
            mode === "register" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
          }`}
        >
          {t("tabRegister")}
        </button>
      </div>

      <div className="mt-3 text-lg font-semibold">
        {mode === "login" ? t("loginTitle") : t("registerTitle")}
      </div>
      <div className="mt-1 text-sm text-slate-500">
        {mode === "login" ? t("loginSubtitle") : t("registerSubtitle")}
      </div>

      {error ? (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
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

      {mode === "login" ? (
        <form action={loginAction} className="mt-4 space-y-3">
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
            className="ui-btn-primary w-full disabled:opacity-60"
          >
            {pending ? t("signingIn") : t("signIn")}
          </button>
        </form>
      ) : (
        <form action={registerAction} className="mt-4 space-y-3">
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
          <p className="text-[11px] text-slate-500">{t("passwordHint")}</p>
          <button
            type="submit"
            disabled={pending}
            className="ui-btn-primary w-full disabled:opacity-60"
          >
            {pending ? t("creatingAccount") : t("createAccount")}
          </button>
        </form>
      )}

      <div className="my-4 flex items-center gap-3 text-xs text-slate-500">
        <div className="h-px flex-1 bg-surface-line" />
        {t("orFacebook")}
        <div className="h-px flex-1 bg-surface-line" />
      </div>

      {metaOAuthConfigured ? (
        <form action={loginWithFacebook}>
          <input type="hidden" name="locale" value={locale} />
          <input
            type="hidden"
            name="callbackUrl"
            value={callbackUrl || `/${locale}/onboarding/meta`}
          />
          <button type="submit" className="ui-btn-primary w-full">
            {t("loginButtonRecommended")}
          </button>
          <p className="mt-2 text-center text-[11px] text-violet-700">{t("loginFacebookHint")}</p>
        </form>
      ) : (
        <button
          type="button"
          disabled
          className="ui-btn-secondary w-full cursor-not-allowed opacity-60"
        >
          {t("loginButton")}
        </button>
      )}

      <div className="mt-3 text-xs text-slate-500">
        {t("loginScopesExtended", {
          adsRead: t("adsRead"),
          adsManagement: t("adsManagement"),
          businessManagement: t("businessManagement"),
          pagesShowList: t("pagesShowList")
        })}
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        {metaOAuthConfigured ? t("metaOptionalHint") : t("metaNotConfiguredHint")}
      </p>
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
      <label className="text-xs text-slate-600" htmlFor={name}>
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
