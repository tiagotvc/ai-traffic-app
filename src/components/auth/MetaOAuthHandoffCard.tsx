"use client";

import { useTranslations } from "next-intl";

import { MetaBrandMark } from "@/components/brand/MetaBrandMark";
import { TrafficAILogo } from "@/components/brand/TrafficAILogo";
import { cn } from "@/lib/cn";

export function MetaOAuthHandoffCard({
  mode = "login",
  variant = "portal"
}: {
  mode?: "login" | "business";
  variant?: "portal" | "premium";
}) {
  const tAuth = useTranslations("auth");
  const tConnect = useTranslations("connectPlatform");
  const isBusiness = mode === "business";
  const isPremium = variant === "premium";

  const title = isBusiness ? tConnect("metaHandoffTitle") : tAuth("facebookHandoffTitle");
  const body = isBusiness ? tConnect("metaHandoffBody") : tAuth("facebookHandoffBody");

  const steps = isBusiness
    ? [tConnect("metaHandoffStep1"), tConnect("metaHandoffStep2"), tConnect("metaHandoffStep3")]
    : [tAuth("facebookHandoffPermission1"), tAuth("facebookHandoffSecure")];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl p-5",
        isPremium
          ? "auth-premium-card border-white/10"
          : "border border-[var(--border-color)]/80 bg-gradient-to-br from-slate-50 via-white to-violet-50/40 shadow-sm"
      )}
    >
      {!isPremium ? (
        <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-violet-200/40 blur-2xl" />
      ) : (
        <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-violet-500/20 blur-2xl" />
      )}

      <div className="relative flex flex-col items-center">
        {isPremium ? (
          <div className="flex items-center justify-center py-1">
            <div className="relative flex items-center">
              <div className="relative z-10 flex h-12 w-12 items-center justify-center">
                <TrafficAILogo
                  size="sm"
                  showText={false}
                  variant="dark"
                  className="orion-logo--sidebar-collapsed"
                />
              </div>
              <MetaBrandMark className="relative z-20 -ml-2 h-10 w-10 drop-shadow-[0_8px_18px_rgba(24,119,242,0.3)]" />
            </div>
          </div>
        ) : (
          <div className="flex w-full items-center justify-between gap-3">
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
        )}
      </div>

      <p
        className={cn(
          "relative mt-4 text-sm font-semibold",
          isPremium ? "text-white" : "text-[var(--text-main)]"
        )}
      >
        {title}
      </p>
      <p
        className={cn(
          "relative mt-1 text-xs leading-relaxed",
          isPremium ? "text-violet-200/75" : "text-[var(--text-dim)]"
        )}
      >
        {body}
      </p>

      <ul className="relative mt-4 space-y-2">
        {steps.map((step) => (
          <li
            key={step}
            className={cn(
              "flex items-start gap-2.5 text-xs leading-relaxed",
              isPremium ? "text-violet-200/80" : "text-[var(--text-dim)]"
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                isPremium
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-[rgba(124,58,237,0.1)] text-[var(--violet)]"
              )}
            >
              ✓
            </span>
            {step}
          </li>
        ))}
      </ul>
    </div>
  );
}
