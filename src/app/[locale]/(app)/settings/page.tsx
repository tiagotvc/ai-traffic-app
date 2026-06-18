import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { ConnectMetaButton } from "@/components/ConnectMetaButton";
import { ProfileClient } from "@/components/profile/ProfileClient";
import { isMetaOAuthConfigured } from "@/lib/meta-env";

export default async function SettingsPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const metaOAuthConfigured = isMetaOAuthConfigured();
  const session = await auth();
  const metaOAuthError =
    (session as { metaOAuthError?: string } | null)?.metaOAuthError ?? null;

  return (
    <ProfileClient
      locale={locale}
      metaOAuthConfigured={metaOAuthConfigured}
      metaOAuthError={metaOAuthError}
      connectMetaSlot={<ConnectMetaButton locale={locale} />}
    />
  );
}
