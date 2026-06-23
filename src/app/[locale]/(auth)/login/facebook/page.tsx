import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { FacebookLoginHandoffForm } from "@/components/auth/FacebookLoginHandoffForm";
import { LoginMarketingPanel } from "@/components/auth/LoginMarketingPanel";
import { OrionAgencyLogo } from "@/components/brand/OrionAgencyLogo";
import { Link } from "@/i18n/navigation";
import { isMetaOAuthConfigured } from "@/lib/meta-env";

export default async function FacebookLoginHandoffPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { locale } = await params;
  const { callbackUrl } = await searchParams;

  if (!isMetaOAuthConfigured()) {
    redirect(`/${locale}/login`);
  }

  const tCommon = await getTranslations("common");
  const tNav = await getTranslations("nav");
  const redirectTo =
    callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : `/${locale}/dashboard`;

  return (
    <div className="h-screen overflow-hidden lg:grid lg:grid-cols-2">
      <aside className="hidden h-screen overflow-hidden lg:block">
        <LoginMarketingPanel />
      </aside>

      <div className="auth-premium-panel relative flex h-screen flex-col overflow-hidden">
        <div className="auth-premium-grid" />
        <div
          className="auth-premium-glow -right-16 top-0 h-72 w-72"
          style={{ background: "radial-gradient(circle, rgba(245,166,35,0.12) 0%, transparent 65%)" }}
        />
        <div className="auth-premium-glow -bottom-24 left-0 h-64 w-64 bg-violet-500/15" />

        <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto lg:overflow-hidden">
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 sm:px-10 lg:py-8">
            <div className="mb-6 lg:hidden">
              <OrionAgencyLogo size="md" variant="dark" />
            </div>
            <FacebookLoginHandoffForm locale={locale} callbackUrl={redirectTo} />
          </div>
        </div>

        <div className="relative z-10 shrink-0 px-6 pb-4 pt-2 text-center text-[11px] text-violet-200/45 lg:pb-5">
          © {new Date().getFullYear()} {tCommon("brandFull")}
          <span className="mx-2 text-white/15">·</span>
          <Link
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-violet-200/70 underline-offset-2 transition hover:text-amber-300 hover:underline"
          >
            {tNav("terms")}
          </Link>
          <span className="mx-2 text-white/15">·</span>
          <Link
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-violet-200/70 underline-offset-2 transition hover:text-amber-300 hover:underline"
          >
            {tNav("privacy")}
          </Link>
          <span className="mx-2 text-white/15">·</span>
          <Link
            href="/data-deletion"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-violet-200/70 underline-offset-2 transition hover:text-amber-300 hover:underline"
          >
            {tNav("dataDeletion")}
          </Link>
        </div>
      </div>
    </div>
  );
}
