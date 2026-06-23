"use client";

import { useLocale, useTranslations } from "next-intl";

import { TrafficAILogo } from "@/components/brand/TrafficAILogo";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

const LOCALE_LABELS: Record<AppLocale, string> = {
  "pt-BR": "PT",
  en: "EN"
};

const LEGAL_LINKS = [
  { href: "/terms", key: "navTerms" as const },
  { href: "/privacy", key: "navPrivacy" as const },
  { href: "/data-deletion", key: "navDataDeletion" as const }
] as const;

export function LegalShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("marketing");
  const tCommon = useTranslations("common");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();

  function pickLocale(next: AppLocale) {
    if (next !== locale) router.replace(pathname, { locale: next });
  }

  return (
    <div className="min-h-screen bg-[#0a0f14] text-[#f8fafc]">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0a0f14]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="shrink-0">
            <TrafficAILogo size="sm" productLabel={tCommon("product")} variant="dark" />
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
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
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-violet-100/90 transition hover:text-white sm:inline-flex"
            >
              {t("signIn")}
            </Link>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-white/10 bg-[#070b10]">
        <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div>
            <TrafficAILogo size="sm" productLabel={tCommon("product")} variant="dark" />
            <p className="mt-2 max-w-xs text-sm text-violet-200/60">{t("legalFooterTagline")}</p>
            <Link
              href="/"
              className="mt-3 inline-block text-sm font-medium text-amber-400/90 transition hover:text-amber-300"
            >
              {t("legalBackToSite")}
            </Link>
          </div>
          <nav className="flex flex-col gap-2 text-sm text-violet-200/70">
            {LEGAL_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={
                  pathname === item.href
                    ? "font-medium text-amber-400"
                    : "transition hover:text-white"
                }
              >
                {t(item.key)}
              </Link>
            ))}
            <Link href="/support" className="transition hover:text-white">
              {t("navSupport")}
            </Link>
          </nav>
        </div>
        <div className="border-t border-white/5 py-4 text-center text-xs text-violet-200/40">
          {t("footerCopyright", { year: new Date().getFullYear() })}
        </div>
      </footer>
    </div>
  );
}
