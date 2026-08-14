import { getTranslations } from "next-intl/server";

import { OrionAgencyLogo } from "@/components/brand/OrionAgencyLogo";
import { CookieConsentBanner } from "@/components/marketing/CookieConsentBanner";
import { Link } from "@/i18n/navigation";

/**
 * Shell das páginas de campanha (tráfego pago). É o site institucional menos tudo que
 * dá rota de fuga: sem menu, sem âncoras, sem seletor de idioma. Quem chega aqui veio de
 * um anúncio e tem um caminho só, começar o teste.
 *
 * O único link de saída no topo é "Entrar", para quem já é cliente e clicou no anúncio
 * sem querer ficar preso numa página de cadastro.
 *
 * O banner de cookies continua: a página é pública e o Pixel roda nela.
 */
export default async function CampaignLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("marketing");

  return (
    <div className="marketing-ds-root min-h-screen" data-theme="dark">
      <header className="border-b border-[var(--border-color)] bg-[var(--surface-header)]">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <OrionAgencyLogo size="sm" variant="dark" className="orion-logo--sidebar orion-logo--nav" />
          <Link
            href="/login"
            className="text-sm font-medium text-[var(--text-dim)] transition hover:text-[var(--text-main)]"
          >
            {t("signIn")}
          </Link>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-[var(--border-color)] bg-[var(--surface-bg)]">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-8 text-xs text-[var(--text-dimmer)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>{t("footerCopyright", { year: new Date().getFullYear() })}</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/terms" className="hover:text-[var(--text-main)]">
              {t("navTerms")}
            </Link>
            <Link href="/privacy" className="hover:text-[var(--text-main)]">
              {t("navPrivacy")}
            </Link>
            <Link href="/support" className="hover:text-[var(--text-main)]">
              {t("navSupport")}
            </Link>
          </div>
        </div>
        <div className="border-t border-[var(--border-color)] py-3 text-center text-[11px] text-[var(--text-dimmer)]">
          {t("footerCompany")}
        </div>
      </footer>

      <CookieConsentBanner />
    </div>
  );
}
