"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export function LanguageSwitcher({
  variant = "default",
  collapsed = false
}: {
  variant?: "default" | "sidebar";
  collapsed?: boolean;
}) {
  const t = useTranslations("common");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();

  const wrap =
    variant === "sidebar"
      ? collapsed
        ? "flex justify-center px-0 py-1"
        : "px-1 py-1"
      : "mt-3 border-t border-surface-line pt-3";
  const labelClass = variant === "sidebar" ? "text-[11px] text-slate-500" : "text-[11px] text-slate-500";
  const selectClass =
    variant === "sidebar"
      ? collapsed
        ? "h-8 w-8 cursor-pointer rounded-lg border border-white/10 bg-white/5 text-[10px] text-slate-300"
        : "mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-slate-200"
      : "mt-1 w-full rounded-lg border border-surface-line bg-white px-2 py-1.5 text-xs text-slate-700";

  return (
    <div className={wrap}>
      {!(variant === "sidebar" && collapsed) ? (
        <div className={labelClass}>{t("language")}</div>
      ) : null}
      <select
        title={t("language")}
        value={locale}
        onChange={(e) => {
          const next = e.target.value as AppLocale;
          router.replace(pathname, { locale: next });
        }}
        className={selectClass}
      >
        {routing.locales.map((loc) => (
          <option key={loc} value={loc}>
            {loc === "pt-BR" ? t("ptBR") : t("en")}
          </option>
        ))}
      </select>
    </div>
  );
}
