import { getTranslations } from "next-intl/server";

import { LoginForm } from "@/components/LoginForm";
import { StripOAuthHash } from "@/components/StripOAuthHash";
import { isMetaOAuthConfigured } from "@/lib/meta-env";

export default async function LoginPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { locale } = await params;
  const { callbackUrl } = await searchParams;
  const tCommon = await getTranslations("common");

  const redirectTo =
    callbackUrl && callbackUrl.startsWith("/")
      ? callbackUrl
      : `/${locale}/command`;

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
        />
      </div>
    </div>
  );
}
