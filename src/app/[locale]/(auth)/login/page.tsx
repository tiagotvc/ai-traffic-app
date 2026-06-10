import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { LoginForm } from "@/components/LoginForm";
import { StripOAuthHash } from "@/components/StripOAuthHash";
import { isMetaOAuthConfigured } from "@/lib/meta-env";

export default async function LoginPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ callbackUrl?: string; switch?: string }>;
}) {
  const { locale } = await params;
  const { callbackUrl, switch: switchParam } = await searchParams;
  const tCommon = await getTranslations("common");
  const session = await auth();
  const switchAccount = switchParam === "1";
  const currentUserEmail = session?.user?.email ?? null;

  const redirectTo =
    callbackUrl && callbackUrl.startsWith("/")
      ? callbackUrl
      : `/${locale}/dashboard`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-slate-50 to-white">
      <StripOAuthHash />
      <div className="mx-auto flex max-w-md flex-col gap-4 p-6 pt-16">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-lg font-bold text-white">
            ∞
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-brand">Traffic AI</div>
            <div className="text-sm text-slate-500">{tCommon("product")}</div>
          </div>
        </div>
        <LoginForm
          locale={locale}
          callbackUrl={redirectTo}
          metaOAuthConfigured={isMetaOAuthConfigured()}
          switchAccount={switchAccount}
          currentUserEmail={currentUserEmail}
        />
      </div>
    </div>
  );
}
