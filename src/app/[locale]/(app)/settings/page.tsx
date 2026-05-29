import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { ConnectMetaButton } from "@/components/ConnectMetaButton";
import { MetaSetupCallout } from "@/components/MetaSetupCallout";
import { SettingsClient } from "@/components/SettingsClient";
import { isMetaOAuthConfigured } from "@/lib/meta-env";

export default async function SettingsPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("settings");
  const metaOAuthConfigured = isMetaOAuthConfigured();
  const session = await auth();
  const metaOAuthError =
    (session as { metaOAuthError?: string } | null)?.metaOAuthError ?? null;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium text-slate-500">{t("breadcrumb")}</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>
      </div>
      {!metaOAuthConfigured ? <MetaSetupCallout /> : null}
      <SettingsClient
        locale={locale}
        metaOAuthConfigured={metaOAuthConfigured}
        metaOAuthError={metaOAuthError}
        connectMetaSlot={<ConnectMetaButton locale={locale} />}
      />
    </div>
  );
}
