import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { FacebookLoginHandoffForm } from "@/components/auth/FacebookLoginHandoffForm";
import { TrafficAILogo } from "@/components/brand/TrafficAILogo";
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
  const redirectTo =
    callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : `/${locale}/dashboard`;

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 to-white">
      <div className="border-b border-[var(--border-color)] bg-white px-6 py-5">
        <TrafficAILogo size="sm" productLabel={tCommon("product")} variant="light" />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10">
        <FacebookLoginHandoffForm locale={locale} callbackUrl={redirectTo} />
      </div>
    </div>
  );
}
