"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const ADDON_ICONS: Record<string, React.ReactNode> = {
  clients: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  ads: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
    </svg>
  ),
  ai: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  )
};

export function BillingAddonsCard() {
  const t = useTranslations("billingPage");

  const addons: Array<{ label: string; icon: keyof typeof ADDON_ICONS; color: string }> = [
    { label: t("addonClients"), icon: "clients", color: "bg-blue-500/15 text-blue-500" },
    { label: t("addonAds"), icon: "ads", color: "bg-amber-500/15 text-[var(--amber-bright)]" },
    { label: t("addonAi"), icon: "ai", color: "bg-pink-500/15 text-pink-500" }
  ];

  return (
    <div className="rounded-xl border border-[rgba(245,166,35,0.25)] bg-[rgba(245,166,35,0.06)] px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text-main)]">{t("addonsTitle")}</p>
          <p className="text-[11px] text-[var(--text-dim)]">{t("addonsSubtitle")}</p>
        </div>
        <Link
          href="/billing/addons"
          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-600"
        >
          {t("addonsCta")}
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {addons.map((a) => (
          <span
            key={a.label}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--surface-card)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-dim)] shadow-sm"
          >
            <span className={`flex h-6 w-6 items-center justify-center rounded-md ${a.color}`}>
              {ADDON_ICONS[a.icon]}
            </span>
            {a.label}
          </span>
        ))}
      </div>
    </div>
  );
}
