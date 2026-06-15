"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { loginWithFacebook } from "@/app/[locale]/(auth)/login/actions";
import { MetaOAuthHandoffCard } from "@/components/auth/MetaOAuthHandoffCard";
import { FacebookBrandIcon } from "@/components/brand/MetaBrandMark";
import { Link } from "@/i18n/navigation";

export function FacebookLoginHandoffForm({
  locale,
  callbackUrl
}: {
  locale: string;
  callbackUrl: string;
}) {
  const t = useTranslations("auth");
  const [pending, setPending] = useState(false);

  return (
    <div className="w-full max-w-md">
      <Link
        href="/login"
        className="text-sm font-medium text-violet-600 transition hover:text-violet-500"
      >
        ← {t("facebookHandoffBack")}
      </Link>

      <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">
        {t("facebookHandoffPageTitle")}
      </h1>
      <p className="mt-2 text-sm text-slate-500">{t("facebookHandoffPageSubtitle")}</p>

      <div className="mt-6">
        <MetaOAuthHandoffCard mode="login" />
      </div>

      <form action={loginWithFacebook} onSubmit={() => setPending(true)} className="mt-6">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <button
          type="submit"
          disabled={pending}
          className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#1877F2] to-[#0d5bb5] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:shadow-blue-500/35 disabled:opacity-80"
        >
          <FacebookBrandIcon className="h-5 w-5 text-white" />
          {pending ? t("metaOAuth.redirecting") : t("facebookHandoffContinue")}
        </button>
      </form>

      <p className="mt-4 text-center text-[11px] text-slate-400">{t("facebookHandoffSecure")}</p>
    </div>
  );
}
