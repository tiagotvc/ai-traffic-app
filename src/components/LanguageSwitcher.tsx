"use client";

import { useLocale, useTranslations } from "next-intl";

import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

const LOCALE_SHORT: Record<AppLocale, string> = {
  "pt-BR": "PT",
  en: "EN"
};

export function LanguageSwitcher({
  variant = "default",
  collapsed = false,
  hideLabel = false
}: {
  variant?: "default" | "sidebar";
  collapsed?: boolean;
  hideLabel?: boolean;
}) {
  const t = useTranslations("common");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();

  function pick(next: AppLocale) {
    if (next === locale) return;
    router.replace(pathname, { locale: next });
  }

  if (variant === "sidebar") {
    return (
      <div className={collapsed ? "flex justify-center px-0 py-1" : "px-1 py-1"}>
        <div
          className={`flex gap-0.5 rounded-full border border-white/10 bg-white/[0.06] p-1 ${
            collapsed ? "flex-col" : "w-full"
          }`}
          role="group"
          aria-label={t("language")}
        >
          {routing.locales.map((loc) => {
            const active = loc === locale;
            return (
              <button
                key={loc}
                type="button"
                onClick={() => pick(loc)}
                aria-pressed={active}
                title={t(loc === "pt-BR" ? "ptBR" : "en")}
                className={`rounded-full text-[11px] font-semibold tracking-wide transition-all duration-200 ${
                  collapsed ? "h-7 w-7" : "flex-1 px-3 py-1.5"
                } ${
                  active
                    ? "bg-violet-600 text-white shadow-md shadow-violet-900/40"
                    : "text-slate-400 hover:bg-white/10 hover:text-slate-200"
                }`}
              >
                {LOCALE_SHORT[loc]}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const wrap = "mt-3 border-t border-surface-line pt-3";
  const labelClass = "text-[11px] text-slate-500";

  return (
    <div className={wrap}>
      {!hideLabel ? <div className={labelClass}>{t("language")}</div> : null}
      <div className="relative mt-1">
        <div
          className="flex gap-0.5 rounded-full border border-surface-line bg-slate-100 p-1"
          role="group"
          aria-label={t("language")}
        >
          {routing.locales.map((loc) => {
            const active = loc === locale;
            return (
              <button
                key={loc}
                type="button"
                onClick={() => pick(loc)}
                aria-pressed={active}
                className={`flex-1 rounded-full px-2 py-1.5 text-xs font-medium transition-all duration-200 ${
                  active ? "bg-violet-600 text-white shadow-sm" : "text-slate-600 hover:bg-white"
                }`}
              >
                {t(loc === "pt-BR" ? "ptBR" : "en")}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
