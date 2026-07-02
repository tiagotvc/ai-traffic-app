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
    <div className="w-full max-w-[420px]">
      <Link
        href="/login"
        className="hidden"
      >
        <span aria-hidden>←</span>
        {t("facebookHandoffBack")}
      </Link>

      <h1 className="font-heading text-2xl font-bold tracking-tight text-white sm:text-[1.75rem]">
        {t("facebookHandoffPageTitle")}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-violet-200/75">{t("facebookHandoffPageSubtitle")}</p>

      <div className="mt-6">
        <MetaOAuthHandoffCard mode="login" variant="premium" />
      </div>

      <form action={loginWithFacebook} onSubmit={() => setPending(true)} className="mt-6">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <button
          type="submit"
          disabled={pending}
          className="ui-btn-meta min-h-12 w-full px-5 py-3 text-base"
        >
          <FacebookBrandIcon className="h-5 w-5 text-white" />
          {pending ? t("metaOAuth.redirecting") : t("facebookHandoffContinue")}
        </button>
      </form>

      <p className="mt-4 text-center text-[11px] text-violet-300/45">{t("facebookHandoffSecure")}</p>
      <Link
        href="/login"
        className="mt-5 flex items-center justify-center gap-1.5 text-sm font-medium text-violet-200/70 transition hover:text-violet-300"
      >
        <span aria-hidden>←</span>
        {t("facebookHandoffBack")}
      </Link>
    </div>
  );
}
