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
    <div className="marketing-ds-root campaign-lp min-h-screen font-body" data-theme="dark">
      <header className="sticky top-0 z-50 h-[70px] border-b border-[var(--lp-border-soft)] bg-[rgba(10,15,20,0.87)] backdrop-blur-xl">
        <div className="mx-auto flex h-full w-[min(1160px,calc(100%-40px))] items-center justify-between gap-6">
          <OrionAgencyLogo size="sm" variant="dark" className="orion-logo--sidebar orion-logo--nav" />
          <Link
            href="/login"
            className="text-sm text-[var(--text-dim)] transition hover:text-[var(--text-main)]"
          >
            {t("signIn")}
          </Link>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-[var(--lp-border-soft)] px-0 pb-5 pt-7 text-[11px] text-[var(--text-dimmer)]">
        <div className="mx-auto flex w-[min(1160px,calc(100%-40px))] flex-wrap items-center justify-between gap-4">
          <span>
            {t("footerCopyright", { year: new Date().getFullYear() })} · {t("footerCompany")}
          </span>
          <div className="flex gap-5">
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
      </footer>

      <CookieConsentBanner />
    </div>
  );
}
