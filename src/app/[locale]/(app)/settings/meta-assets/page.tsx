import { MetaAssetsHubClient } from "@/components/MetaAssetsHubClient";
import { ConnectMetaButton } from "@/components/ConnectMetaButton";

export default async function MetaAssetsPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <MetaAssetsHubClient
      locale={locale}
      reconnectSlot={
        <ConnectMetaButton locale={locale} redirectTo={`/${locale}/settings/meta-assets`} variant="secondary" />
      }
    />
  );
}
