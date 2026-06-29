"use client";

import { useLocale, useTranslations } from "next-intl";

import { BackToTopButton } from "@/components/ui/BackToTopButton";
import { OrionAgencyLogo } from "@/components/brand/OrionAgencyLogo";
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
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();

  function pickLocale(next: AppLocale) {
    if (next !== locale) router.replace(pathname, { locale: next });
  }

  return (
    <div className="marketing-ds-root min-h-screen" data-theme="dark">
      <header className="sticky top-0 z-40 border-b border-[var(--border-color)] bg-[var(--surface-header)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="shrink-0">
            <OrionAgencyLogo size="sm" variant="dark" className="orion-logo--sidebar orion-logo--login" />
          </Link>

          <nav className="hidden items-center gap-5 md:flex">
            {LEGAL_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={
                  pathname === item.href
                    ? "text-sm font-medium text-[var(--ui-accent)]"
                    : "text-sm font-medium text-[var(--text-dim)] transition hover:text-[var(--text-main)]"
                }
              >
                {t(item.key)}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
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
            <Link
              href="/login"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-dim)] transition hover:text-[var(--text-main)] sm:inline-flex"
            >
              {t("signIn")}
            </Link>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-[var(--border-color)] bg-[var(--surface-bg)]">
        <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div>
            <OrionAgencyLogo size="sm" variant="dark" className="orion-logo--sidebar orion-logo--login" />
            <p className="mt-2 max-w-xs text-sm text-[var(--text-dim)]">{t("legalFooterTagline")}</p>
            <Link href="/" className="marketing-link-accent mt-3 inline-block text-sm">
              {t("legalBackToSite")}
            </Link>
          </div>
          <nav className="flex flex-col gap-2 text-sm text-[var(--text-dim)]">
            {LEGAL_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={
                  pathname === item.href
                    ? "font-medium text-[var(--ui-accent)]"
                    : "transition hover:text-[var(--text-main)]"
                }
              >
                {t(item.key)}
              </Link>
            ))}
            <Link href="/support" className="transition hover:text-[var(--text-main)]">
              {t("navSupport")}
            </Link>
          </nav>
        </div>
        <div className="border-t border-[var(--border-color)] py-4 text-center text-xs text-[var(--text-dimmer)]">
          {t("footerCopyright", { year: new Date().getFullYear() })}
        </div>
      </footer>

      <BackToTopButton label={t("legalBackToTop", { defaultMessage: "Voltar ao topo" })} />
    </div>
  );
}
