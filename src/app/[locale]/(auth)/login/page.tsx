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

      <div
        className="flex h-screen flex-col overflow-hidden bg-[var(--surface-bg)]"
        data-theme="light"
      >
        <div className="shrink-0 border-b border-[var(--border-color)] bg-gradient-to-r from-violet-950 to-indigo-950 px-6 py-5 text-white lg:hidden">
          <OrionAgencyLogo size="md" variant="dark" />
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:overflow-hidden">
          <div className="shrink-0 px-6 pt-4 lg:hidden">
            <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 p-4">
              <LoginMarketingSlider compact />
            </div>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center px-6 py-5 sm:px-10 lg:py-6">
            <div className="w-full max-w-[420px]">
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

        <div className="shrink-0 px-6 pb-4 pt-2 text-center text-[11px] text-[var(--text-dimmer)] lg:pb-5">
          © {new Date().getFullYear()} {tCommon("brandFull")}
          <span className="mx-2 text-[var(--border-hover)]">·</span>
          <Link
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[var(--text-dim)] underline-offset-2 transition hover:text-[var(--violet)] hover:underline"
          >
            {tNav("terms")}
          </Link>
        </div>
      </div>
    </div>
  );
}
