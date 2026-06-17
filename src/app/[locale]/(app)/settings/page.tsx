import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { ConnectMetaButton } from "@/components/ConnectMetaButton";
import { CompactPageHeader } from "@/components/layout/CompactPageHeader";
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
    <div className="w-full space-y-4">
      <CompactPageHeader title={t("title")} subtitle={t("subtitle")} />
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
