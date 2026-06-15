"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { MetaOAuthHandoffCard } from "@/components/auth/MetaOAuthHandoffCard";
import { FacebookBrandIcon } from "@/components/brand/MetaBrandMark";

export function MetaConnectButton({
  connectAction,
  disabled = false
}: {
  connectAction: () => void | Promise<void>;
  disabled?: boolean;
}) {
  const t = useTranslations("connectPlatform");
  const [pending, setPending] = useState(false);

  return (
    <div className="space-y-4">
      <MetaOAuthHandoffCard mode="business" />

      <form
        action={connectAction}
        onSubmit={() => setPending(true)}
      >
        <button
          type="submit"
          disabled={disabled || pending}
          className="group relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-[#1877F2] via-[#166FE5] to-[#0d5bb5] px-5 py-4 text-left text-white shadow-lg shadow-blue-500/25 transition hover:shadow-blue-500/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 opacity-0 transition group-hover:opacity-100" />
          <span className="relative flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
              <FacebookBrandIcon className="h-6 w-6 text-white" />
            </span>
            <span>
              <span className="block text-base font-semibold">
                {pending ? t("metaRedirecting") : t("metaConnect")}
              </span>
              <span className="mt-0.5 block text-sm text-blue-100/90">{t("metaHint")}</span>
            </span>
          </span>
          <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-lg">
            {pending ? "…" : "→"}
          </span>
        </button>
      </form>

      <p className="text-center text-[11px] text-slate-400">{t("metaSecureNote")}</p>
    </div>
  );
}
