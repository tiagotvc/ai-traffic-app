"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";

import { TrafficAILogo } from "@/components/brand/TrafficAILogo";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

const LOCALE_LABELS: Record<AppLocale, string> = {
  "pt-BR": "PT",
  en: "EN"
};

const NAV = [
  { href: "/#product", key: "navProduct" as const },
  { href: "/pricing", key: "navPricing" as const },
  { href: "/about", key: "navAbout" as const },
  { href: "/support", key: "navSupport" as const }
];

export function MarketingShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("marketing");
  const tCommon = useTranslations("common");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  function pickLocale(next: AppLocale) {
    if (next !== locale) router.replace(pathname, { locale: next });
    setMobileOpen(false);
  }

  return (
    <div className="min-h-screen bg-[#0a0f14] text-[#f8fafc]">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0a0f14]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="shrink-0">
            <TrafficAILogo size="sm" productLabel={tCommon("product")} variant="dark" />
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="text-sm font-medium text-violet-100/80 transition hover:text-white"
              >
                {t(item.key)}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 sm:flex">
            <div className="flex rounded-lg border border-white/10 p-0.5">
              {routing.locales.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => pickLocale(loc)}
                  className="rounded-md px-2.5 py-1 text-[11px] font-semibold transition"
                  style={{
                    background: locale === loc ? "rgba(245,166,35,0.2)" : "transparent",
                    color: locale === loc ? "#f5a623" : "#94a3b8"
                  }}
                >
                  {LOCALE_LABELS[loc]}
                </button>
              ))}
            </div>
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-violet-100/90 transition hover:text-white"
            >
              {t("signIn")}
            </Link>
            <Link
              href="/login?callbackUrl=/dashboard"
              className="rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-2 text-sm font-bold text-[#0f1419] shadow-lg shadow-amber-500/20 transition hover:brightness-105"
            >
              {t("startFree")}
            </Link>
          </div>

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-violet-100 md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? t("closeMenu") : t("openMenu")}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {mobileOpen ? (
          <div className="border-t border-white/10 px-4 py-4 md:hidden">
            <nav className="flex flex-col gap-2">
              {NAV.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-violet-100/90 hover:bg-white/5"
                >
                  {t(item.key)}
                </Link>
              ))}
            </nav>
            <div className="mt-4 flex gap-2">
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="flex-1 rounded-lg border border-white/10 py-2.5 text-center text-sm font-semibold"
              >
                {t("signIn")}
              </Link>
              <Link
                href="/login?callbackUrl=/dashboard"
                onClick={() => setMobileOpen(false)}
                className="flex-1 rounded-lg bg-amber-400 py-2.5 text-center text-sm font-bold text-[#0f1419]"
              >
                {t("startFree")}
              </Link>
            </div>
          </div>
        ) : null}
      </header>

      <main>{children}</main>

      <footer className="border-t border-white/10 bg-[#070b10]">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <TrafficAILogo size="sm" productLabel={tCommon("product")} variant="dark" />
            <p className="mt-2 max-w-sm text-sm text-violet-200/60">{t("footerTagline")}</p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-violet-200/70">
            <Link href="/pricing" className="hover:text-white">
              {t("navPricing")}
            </Link>
            <Link href="/about" className="hover:text-white">
              {t("navAbout")}
            </Link>
            <Link href="/support" className="hover:text-white">
              {t("navSupport")}
            </Link>
            <Link href="/terms" className="hover:text-white">
              {t("navTerms")}
            </Link>
          </div>
        </div>
        <div className="border-t border-white/5 py-4 text-center text-xs text-violet-200/40">
          {t("footerCopyright", { year: new Date().getFullYear() })}
        </div>
      </footer>
    </div>
  );
}
