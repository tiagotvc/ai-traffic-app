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
import { Link } from "@/i18n/navigation";
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

  const termsLink = (chunks: ReactNode) => (
    <Link
      href="/terms"
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold text-[var(--violet)] underline-offset-2 hover:underline"
    >
      {chunks}
    </Link>
  );

  return (
    <div className="w-full">
      <div
        className="mb-5 overflow-hidden rounded-2xl border p-3.5 lg:hidden"
        style={{
          borderColor: "rgba(124, 58, 237, 0.18)",
          background:
            "linear-gradient(135deg, rgba(124,58,237,0.07) 0%, rgba(245,166,35,0.06) 100%)"
        }}
      >
        <div className="flex items-start gap-3">
          <span
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm"
            style={{
              background: "linear-gradient(135deg, var(--violet), var(--violet-bright))",
              color: "#fff"
            }}
          >
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <p className="font-heading text-sm font-bold text-[var(--text-main)]">
              {t("formValueProp")}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-dim)]">
              {t("formValuePropSub")}
            </p>
          </div>
        </div>
      </div>

      {showSwitchBanner ? (
        <div className="mb-4 ui-alert-warning px-3 py-2 text-xs">
          <div className="font-semibold">{t("switchAccountTitle")}</div>
          <p className="mt-1">{t("switchAccountBody", { email: currentUserEmail })}</p>
          <p className="mt-2 text-amber-800">{t("switchAccountHint")}</p>
        </div>
      ) : null}

      <div
        className="flex gap-1 rounded-xl border p-1 text-xs"
        style={{
          borderColor: "var(--border-color)",
          background: "var(--surface-thead)"
        }}
      >
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setTermsAccepted(false);
          }}
          className={cn(
            "flex-1 rounded-lg px-3 py-2 font-semibold transition-all duration-200",
            mode === "login" ? "shadow-sm" : "hover:text-[var(--text-main)]"
          )}
          style={
            mode === "login"
              ? {
                  background: "var(--filter-btn-bg)",
                  color: "var(--text-main)",
                  border: "1px solid var(--border-color)"
                }
              : { color: "var(--text-dim)" }
          }
        >
          {t("tabLogin")}
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          className={cn(
            "flex-1 rounded-lg px-3 py-2 font-semibold transition-all duration-200",
            mode === "register" ? "shadow-sm" : "hover:text-[var(--text-main)]"
          )}
          style={
            mode === "register"
              ? {
                  background: "var(--filter-btn-bg)",
                  color: "var(--text-main)",
                  border: "1px solid var(--border-color)"
                }
              : { color: "var(--text-dim)" }
          }
        >
          {t("tabRegister")}
        </button>
      </div>

      <div className="mt-6 font-heading text-2xl font-bold tracking-tight text-[var(--text-main)] sm:text-[1.75rem]">
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
            <div className="h-px flex-1 bg-[var(--border-color)]" />
            {t("orEmail")}
            <div className="h-px flex-1 bg-[var(--border-color)]" />
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
          <button
            type="submit"
            disabled={pending}
            className="ui-btn-primary mt-1 w-full py-2.5 text-sm font-semibold disabled:opacity-60"
          >
            {pending ? t("signingIn") : t("signIn")}
          </button>
          <p className="text-center text-[11px] leading-relaxed text-[var(--text-dimmer)]">
            {t.rich("termsLoginHint", { terms: termsLink })}
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
          <p className="text-[11px] text-[var(--text-dim)]">{t("passwordHint")}</p>
          <div className="flex items-start gap-3 pt-0.5">
            <input
              type="checkbox"
              id="terms-accept"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              required
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-[var(--border-color)] accent-[var(--violet)]"
            />
            <label
              htmlFor="terms-accept"
              className="cursor-pointer text-xs leading-relaxed text-[var(--text-dim)]"
            >
              {t.rich("termsAccept", { terms: termsLink })}
            </label>
          </div>
          <button
            type="submit"
            disabled={pending || !termsAccepted}
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
      <label className="ui-label mb-1.5 block font-semibold" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required
        autoComplete={autoComplete}
        className="ui-strip-input w-full"
      />
    </div>
  );
}
