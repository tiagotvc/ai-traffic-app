import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { LoginForm } from "@/components/LoginForm";
import { LoginMarketingPanel } from "@/components/auth/LoginMarketingPanel";
import { LoginMarketingSlider } from "@/components/auth/LoginMarketingSlider";
import { OrionAgencyLogo } from "@/components/brand/OrionAgencyLogo";
import { StripOAuthHash } from "@/components/StripOAuthHash";
import { Link } from "@/i18n/navigation";
import { isGoogleOAuthConfigured } from "@/lib/google-env";
import { isMetaOAuthConfigured } from "@/lib/meta-env";

export default async function LoginPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ callbackUrl?: string; switch?: string; error?: string }>;
}) {
  const { locale } = await params;
  const { callbackUrl, switch: switchParam, error: queryError } = await searchParams;
  const tCommon = await getTranslations("common");
  const tNav = await getTranslations("nav");
  const session = await auth();
  const switchAccount = switchParam === "1";
  const currentUserEmail = session?.user?.email ?? null;

  const redirectTo =
    callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : `/${locale}/dashboard`;

  return (
    <div className="h-screen overflow-hidden lg:grid lg:grid-cols-2">
      <StripOAuthHash />

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

        <div className="relative z-10 shrink-0 border-b border-white/10 bg-gradient-to-r from-violet-950/80 to-indigo-950/80 px-6 py-5 backdrop-blur-md lg:hidden">
          <OrionAgencyLogo size="md" variant="dark" />
        </div>

        <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto lg:overflow-hidden">
          <div className="shrink-0 px-6 pt-4 lg:hidden">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-violet-950/90 via-indigo-950/90 to-slate-950/90 p-4">
              <LoginMarketingSlider compact />
            </div>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center px-6 py-5 sm:px-10 lg:py-8">
            <div className="auth-premium-card w-full max-w-[420px]">
              <LoginForm
                locale={locale}
                callbackUrl={redirectTo}
                googleOAuthConfigured={isGoogleOAuthConfigured()}
                metaOAuthConfigured={isMetaOAuthConfigured()}
                switchAccount={switchAccount}
                currentUserEmail={currentUserEmail}
                accountSuspended={queryError === "account_suspended"}
              />
            </div>
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
        </div>
      </div>
    </div>
  );
}
