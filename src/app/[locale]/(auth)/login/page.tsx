import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { LoginForm } from "@/components/LoginForm";
import { LoginMarketingPanel } from "@/components/auth/LoginMarketingPanel";
import { TrafficAILogo } from "@/components/brand/TrafficAILogo";
import { StripOAuthHash } from "@/components/StripOAuthHash";
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
  const session = await auth();
  const switchAccount = switchParam === "1";
  const currentUserEmail = session?.user?.email ?? null;

  const redirectTo =
    callbackUrl && callbackUrl.startsWith("/")
      ? callbackUrl
      : `/${locale}/dashboard`;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      <StripOAuthHash />

      {/* Marketing — full height left panel */}
      <div className="hidden lg:block lg:min-h-screen">
        <LoginMarketingPanel productLabel={tCommon("product")} />
      </div>

      {/* Form — full height right panel */}
      <div className="flex min-h-screen flex-col bg-white">
        {/* Mobile marketing header (compact) */}
        <div className="border-b border-[var(--border-color)] bg-gradient-to-r from-violet-950 to-indigo-950 px-6 py-8 text-white lg:hidden">
          <TrafficAILogo size="sm" productLabel={tCommon("product")} variant="dark" />
        </div>

        <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 sm:px-10">
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

        <div className="px-6 pb-6 text-center text-[11px] text-[var(--text-dimmer)] lg:pb-8">
          © {new Date().getFullYear()} Traffic AI
        </div>
      </div>
    </div>
  );
}
