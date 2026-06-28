"use client";

import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState, type ReactNode } from "react";

import {
  loginWithCredentials,
  registerWithCredentials,
  type AuthFormState
} from "@/app/[locale]/(auth)/login/actions";
import { SocialLoginButtons } from "@/components/auth/SocialLoginButtons";
import { LegalModal, type LegalModalType } from "@/components/auth/LegalModal";
import { cn } from "@/lib/cn";

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
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [legalModal, setLegalModal] = useState<LegalModalType | null>(null);
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

  const openLegal = (type: LegalModalType) => (e: React.MouseEvent) => {
    // Evita o link navegar e o clique alternar o checkbox de termos (quando dentro do label).
    e.preventDefault();
    e.stopPropagation();
    setLegalModal(type);
  };

  const termsLink = (chunks: ReactNode) => (
    <button
      type="button"
      onClick={openLegal("terms")}
      className="font-semibold text-[var(--ui-accent)] underline-offset-2 hover:underline"
    >
      {chunks}
    </button>
  );

  const privacyLink = (chunks: ReactNode) => (
    <button
      type="button"
      onClick={openLegal("privacy")}
      className="font-semibold text-[var(--ui-accent)] underline-offset-2 hover:underline"
    >
      {chunks}
    </button>
  );

  return (
    <div className="w-full max-w-[420px]">
      <div className="auth-premium-banner mb-5 lg:hidden">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-900/30">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <p className="font-heading text-sm font-bold text-white">{t("formValueProp")}</p>
            <p className="mt-1 text-xs leading-relaxed text-violet-200/75">{t("formValuePropSub")}</p>
          </div>
        </div>
      </div>

      {showSwitchBanner ? (
        <div className="auth-premium-alert-warning mb-4">
          <div className="font-semibold">{t("switchAccountTitle")}</div>
          <p className="mt-1 text-amber-100/90">{t("switchAccountBody", { email: currentUserEmail })}</p>
          <p className="mt-2 text-amber-200/80">{t("switchAccountHint")}</p>
        </div>
      ) : null}

      <div className="auth-premium-tabs">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setTermsAccepted(false);
          }}
          className={cn("auth-premium-tab", mode === "login" && "auth-premium-tab-active")}
        >
          {t("tabLogin")}
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          className={cn("auth-premium-tab", mode === "register" && "auth-premium-tab-active")}
        >
          {t("tabRegister")}
        </button>
      </div>

      <div className="mt-6 font-heading text-2xl font-bold tracking-tight text-white sm:text-[1.75rem]">
        {mode === "login" ? t("loginTitle") : t("registerTitle")}
      </div>
      <div className="mt-2 text-sm leading-relaxed text-violet-200/75">
        {mode === "login" ? t("loginSubtitle") : t("registerSubtitle")}
      </div>

      {accountSuspended ? (
        <div className="auth-premium-alert-danger mt-3">{t("errors.ACCOUNT_SUSPENDED")}</div>
      ) : null}

      {error ? (
        <div className="auth-premium-alert-danger mt-3">
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
            variant="premium"
          />
          <div className="my-5 flex items-center gap-3 text-xs text-violet-300/50">
            <div className="h-px flex-1 bg-white/10" />
            {t("orEmail")}
            <div className="h-px flex-1 bg-white/10" />
          </div>
        </div>
      ) : null}

      {mode === "login" ? (
        <form action={loginAction} className="space-y-3.5">
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
          <button type="submit" disabled={pending} className="auth-premium-btn mt-1">
            {pending ? t("signingIn") : t("signIn")}
          </button>
          <p className="text-center text-[11px] leading-relaxed text-violet-300/55">
            {t.rich("termsLoginHint", { terms: termsLink, privacy: privacyLink })}
          </p>
        </form>
      ) : (
        <form action={registerAction} className="space-y-3.5">
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
          <p className="text-[11px] text-violet-300/55">{t("passwordHint")}</p>
          <div className="flex items-start gap-3 pt-0.5">
            <input
              type="checkbox"
              id="terms-accept"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              required
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-white/20 bg-white/5 accent-[var(--ui-accent)]"
            />
            <label
              htmlFor="terms-accept"
              className="cursor-pointer text-xs leading-relaxed text-violet-200/75"
            >
              {t.rich("termsAccept", { terms: termsLink, privacy: privacyLink })}
            </label>
          </div>
          <button
            type="submit"
            disabled={pending || !termsAccepted}
            className="auth-premium-btn mt-1"
          >
            {pending ? t("creatingAccount") : t("createAccount")}
          </button>
        </form>
      )}

      <p className="mt-3 text-center text-[11px] text-violet-300/45">{t("metaConnectLaterHint")}</p>

      {legalModal ? (
        <LegalModal type={legalModal} locale={locale} onClose={() => setLegalModal(null)} />
      ) : null}
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
      <label className="auth-premium-label mb-1.5 block" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required
        autoComplete={autoComplete}
        className="auth-premium-input w-full"
      />
    </div>
  );
}
