"use client";

import { useTranslations } from "next-intl";

import { MetaBrandMark } from "@/components/brand/MetaBrandMark";
import { TrafficAILogo } from "@/components/brand/TrafficAILogo";

export function MetaOAuthHandoffCard({
  mode = "login"
}: {
  mode?: "login" | "business";
}) {
  const tAuth = useTranslations("auth");
  const tConnect = useTranslations("connectPlatform");
  const isBusiness = mode === "business";

  const title = isBusiness ? tConnect("metaHandoffTitle") : tAuth("facebookHandoffTitle");
  const body = isBusiness ? tConnect("metaHandoffBody") : tAuth("facebookHandoffBody");

  const steps = isBusiness
    ? [tConnect("metaHandoffStep1"), tConnect("metaHandoffStep2"), tConnect("metaHandoffStep3")]
    : [tAuth("facebookHandoffPermission1"), tAuth("facebookHandoffSecure")];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--border-color)]/80 bg-gradient-to-br from-slate-50 via-white to-violet-50/40 p-4 shadow-sm">
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-violet-200/40 blur-2xl" />

      <div className="relative flex items-center justify-between gap-3">
        <TrafficAILogo size="sm" showText={false} variant="light" />
        <div className="flex flex-1 items-center gap-1 px-2">
          <div className="h-px flex-1 bg-gradient-to-r from-violet-300 to-transparent" />
          <svg className="h-4 w-4 text-[var(--text-dimmer)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          <div className="h-px flex-1 bg-gradient-to-l from-blue-300 to-transparent" />
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <MetaBrandMark className="h-6 w-6" />
        </div>
      </div>

      <p className="relative mt-3 text-sm font-semibold text-[var(--text-main)]">{title}</p>
      <p className="relative mt-1 text-xs leading-relaxed text-[var(--text-dim)]">{body}</p>

      <ul className="relative mt-3 space-y-1.5">
        {steps.map((step) => (
          <li key={step} className="flex items-start gap-2 text-xs text-[var(--text-dim)]">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[rgba(124,58,237,0.1)] text-[10px] font-bold text-[var(--violet)]">
              ✓
            </span>
            {step}
          </li>
        ))}
      </ul>
    </div>
  );
}
