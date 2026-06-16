"use client";

import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

const LOCALE_LABELS: Record<AppLocale, string> = {
  "pt-BR": "ptBR",
  en: "en"
};

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
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const wrap =
    variant === "sidebar"
      ? collapsed
        ? "flex justify-center px-0 py-1"
        : "px-1 py-1"
      : "mt-3 border-t border-surface-line pt-3";
  const labelClass = variant === "sidebar" ? "text-[11px] text-slate-500" : "text-[11px] text-slate-500";

  const triggerClass =
    variant === "sidebar"
      ? collapsed
        ? "flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-sm text-slate-200 hover:bg-white/10"
        : "flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-slate-200 hover:bg-white/10"
      : "flex w-full items-center justify-between rounded-lg border border-surface-line bg-white px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50";

  function pick(next: AppLocale) {
    router.replace(pathname, { locale: next });
    setOpen(false);
  }

  const menu = (
    <div
      className={`absolute z-50 min-w-[140px] overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg ${
        collapsed ? "bottom-full left-0 mb-1" : "left-0 right-0 mt-1"
      }`}
      role="listbox"
    >
      {routing.locales.map((loc) => {
        const active = loc === locale;
        return (
          <button
            key={loc}
            type="button"
            role="option"
            aria-selected={active}
            onClick={() => pick(loc)}
            className={`flex w-full px-3 py-2 text-left text-xs ${
              active ? "bg-violet-50 font-medium text-violet-700" : "text-slate-800 hover:bg-slate-50"
            }`}
          >
            {t(LOCALE_LABELS[loc])}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className={wrap} ref={rootRef}>
      {!(variant === "sidebar" && collapsed) ? (
        <div className={labelClass}>{t("language")}</div>
      ) : null}
      <div className={`relative ${variant === "sidebar" && !collapsed ? "mt-1" : ""}`}>
        <button
          type="button"
          title={t("language")}
          onClick={() => setOpen((o) => !o)}
          className={triggerClass}
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          {collapsed ? (
            <span aria-hidden>🌐</span>
          ) : (
            <>
              <span>{t(LOCALE_LABELS[locale])}</span>
              <span className="text-slate-400">{open ? "▲" : "▼"}</span>
            </>
          )}
        </button>
        {open ? menu : null}
      </div>
    </div>
  );
}
