"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, Menu, X } from "lucide-react";

import { BackToTopButton } from "@/components/ui/BackToTopButton";
import { CookieConsentBanner } from "@/components/marketing/CookieConsentBanner";
import { OrionAgencyLogo } from "@/components/brand/OrionAgencyLogo";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

const LOCALE_LABELS: Record<AppLocale, string> = {
  "pt-BR": "PT",
  en: "EN"
};

const NAV = [
  { href: "/#product", key: "navProduct" as const },
  { href: "/#how-it-works", key: "navHowItWorks" as const },
  { href: "/#compare", key: "navCompare" as const },
  { href: "/#pricing", key: "navPricing" as const },
  { href: "/about", key: "navAbout" as const },
  { href: "/support", key: "navSupport" as const }
];

const POLICIES = [
  { href: "/terms", key: "navTerms" as const },
  { href: "/privacy", key: "navPrivacy" as const },
  { href: "/data-deletion", key: "navDataDeletion" as const }
];

export function MarketingShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("marketing");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  function pickLocale(next: AppLocale) {
    if (next !== locale) router.replace(pathname, { locale: next });
    setMobileOpen(false);
  }

  return (
    <div className="marketing-ds-root min-h-screen" data-theme="dark">
      <header className="sticky top-0 z-40 border-b border-[var(--border-color)] bg-[var(--surface-header)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="shrink-0">
            <OrionAgencyLogo size="sm" variant="dark" className="orion-logo--sidebar orion-logo--nav" />
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="text-sm font-medium text-[var(--text-dim)] transition hover:text-[var(--text-main)]"
              >
                {t(item.key)}
              </Link>
            ))}
            <div className="group relative">
              <button
                type="button"
                className="inline-flex items-center gap-1 text-sm font-medium text-[var(--text-dim)] transition hover:text-[var(--text-main)]"
              >
                {t("navPolicies")}
                <ChevronDown size={14} className="transition group-hover:rotate-180" />
              </button>
              <div className="absolute left-0 top-full hidden min-w-44 pt-2 group-hover:block">
                <div className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-card)] p-1 shadow-xl">
                  {POLICIES.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block rounded-md px-3 py-2 text-sm font-medium text-[var(--text-dim)] transition hover:bg-[var(--surface-bg)] hover:text-[var(--text-main)]"
                    >
                      {t(item.key)}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </nav>

          <div className="hidden items-center gap-2 sm:flex">
            <div className="flex rounded-lg border border-[var(--border-color)] p-0.5">
              {routing.locales.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => pickLocale(loc)}
                  className="rounded-md px-2.5 py-1 text-[11px] font-semibold transition"
                  style={{
                    background: locale === loc ? "var(--ui-accent-muted)" : "transparent",
                    color: locale === loc ? "var(--ui-accent)" : "var(--text-dimmer)"
                  }}
                >
                  {LOCALE_LABELS[loc]}
                </button>
              ))}
            </div>
            <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-dim)] hover:text-[var(--text-main)]">
              {t("signIn")}
            </Link>
            <Link href="/login?callbackUrl=/dashboard" className="ui-btn-accent px-4 py-2 text-sm font-semibold">
              {t("startFree")}
            </Link>
          </div>

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border-color)] text-[var(--text-dim)] md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? t("closeMenu") : t("openMenu")}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {mobileOpen ? (
          <div className="border-t border-[var(--border-color)] px-4 py-4 md:hidden">
            <nav className="flex flex-col gap-2">
              {NAV.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-dim)] hover:bg-[var(--surface-card)]"
                >
                  {t(item.key)}
                </Link>
              ))}
              <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-dimmer)]">
                {t("navPolicies")}
              </p>
              {POLICIES.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-dim)] hover:bg-[var(--surface-card)]"
                >
                  {t(item.key)}
                </Link>
              ))}
            </nav>
            <div className="mt-4 flex gap-2">
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="ui-btn-secondary flex-1 py-2.5 text-center text-sm font-semibold"
              >
                {t("signIn")}
              </Link>
              <Link
                href="/login?callbackUrl=/dashboard"
                onClick={() => setMobileOpen(false)}
                className="ui-btn-accent flex-1 py-2.5 text-center text-sm font-semibold"
              >
                {t("startFree")}
              </Link>
            </div>
          </div>
        ) : null}
      </header>

      <main>{children}</main>

      <footer className="border-t border-[var(--border-color)] bg-[var(--surface-bg)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <OrionAgencyLogo size="sm" variant="dark" className="orion-logo--sidebar orion-logo--login" />
            <p className="mt-2 max-w-sm text-sm text-[var(--text-dim)]">{t("footerTagline")}</p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--text-dim)]">
            <Link href="/pricing" className="hover:text-[var(--text-main)]">
              {t("navPricing")}
            </Link>
            <Link href="/about" className="hover:text-[var(--text-main)]">
              {t("navAbout")}
            </Link>
            <Link href="/support" className="hover:text-[var(--text-main)]">
              {t("navSupport")}
            </Link>
            <Link href="/terms" className="hover:text-[var(--text-main)]">
              {t("navTerms")}
            </Link>
            <Link href="/privacy" className="hover:text-[var(--text-main)]">
              {t("navPrivacy")}
            </Link>
            <Link href="/data-deletion" className="hover:text-[var(--text-main)]">
              {t("navDataDeletion")}
            </Link>
          </div>
        </div>
        <div className="border-t border-[var(--border-color)] py-4 text-center text-xs text-[var(--text-dimmer)]">
          {t("footerCopyright", { year: new Date().getFullYear() })}
        </div>
      </footer>

      <BackToTopButton label={t("legalBackToTop", { defaultMessage: "Voltar ao topo" })} />
      <CookieConsentBanner />
    </div>
  );
}
