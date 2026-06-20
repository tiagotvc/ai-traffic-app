"use client";

import { useLocale, useTranslations } from "next-intl";

import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

const LOCALE_SHORT: Record<AppLocale, string> = {
  "pt-BR": "PT",
  en: "EN"
};

const ACTIVE_PILL =
  "bg-[var(--amber-bright)] text-[#0f1419] shadow-sm shadow-black/15";

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
                    ? ACTIVE_PILL
                    : "text-[#94a3b8] hover:bg-white/10 hover:text-[#f8fafc]"
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

  const wrap = "mt-3 border-t border-[var(--border-color)] pt-3";
  const labelClass = "text-[11px] text-[var(--text-dimmer)]";

  return (
    <div className={wrap}>
      {!hideLabel ? <div className={labelClass}>{t("language")}</div> : null}
      <div className="relative mt-1">
        <div
          className="flex gap-0.5 rounded-full border border-[var(--border-color)] bg-[var(--surface-thead)] p-1"
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
                  active
                    ? ACTIVE_PILL
                    : "text-[var(--text-dim)] hover:bg-[var(--surface-card)]"
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
