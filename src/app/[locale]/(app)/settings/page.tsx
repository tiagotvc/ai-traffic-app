import { auth } from "@/auth";
import { ConnectMetaButton } from "@/components/ConnectMetaButton";
import { isMetaOAuthConfigured } from "@/lib/meta-env";
import { SettingsView } from "@/uxpilot-ui/adapters/SettingsView";

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
    <SettingsView
      locale={locale}
      metaOAuthConfigured={metaOAuthConfigured}
      metaOAuthError={metaOAuthError}
      connectMetaSlot={<ConnectMetaButton locale={locale} />}
    />
  );
}
