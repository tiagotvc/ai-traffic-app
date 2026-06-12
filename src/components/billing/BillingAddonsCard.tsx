"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const ADDON_ICONS: Record<string, React.ReactNode> = {
  clients: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  ads: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
    </svg>
  ),
  ai: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  )
};

export function BillingAddonsCard() {
  const t = useTranslations("billingPage");

  const addons: Array<{ label: string; icon: keyof typeof ADDON_ICONS; color: string }> = [
    { label: t("addonClients"), icon: "clients", color: "bg-blue-100 text-blue-600" },
    { label: t("addonAds"), icon: "ads", color: "bg-violet-100 text-violet-600" },
    { label: t("addonAi"), icon: "ai", color: "bg-pink-100 text-pink-600" }
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-orange-50 shadow-sm">
      <div className="border-b border-amber-100/80 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-bold text-slate-900">{t("addonsTitle")}</p>
            <p className="text-xs text-slate-500">{t("addonsSubtitle")}</p>
          </div>
        </div>
      </div>
      <div className="space-y-2 px-5 py-4">
        {addons.map((a) => (
          <div key={a.label} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white/80 px-3 py-2.5">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${a.color}`}>
              {ADDON_ICONS[a.icon]}
            </span>
            <span className="flex-1 text-sm font-medium text-slate-700">{a.label}</span>
          </div>
        ))}
        <Link
          href="/billing/addons"
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-500 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-amber-600"
        >
          {t("addonsCta")}
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
