"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { DsPageHeader } from "@/design-system";
import { ClientGoogleKeywords } from "@/components/ClientGoogleKeywords";

/**
 * Tela dedicada de exploração de palavras-chave (não escopada): cascata
 * campanha→grupo→anúncio + filtros de correspondência/status, abas keywords/termos/anúncios.
 */
export function GoogleKeywordsExplorerClient({ clientId }: { clientId: string }) {
  const t = useTranslations("client");
  return (
    <div className="space-y-4">
      <DsPageHeader
        breadcrumbs={
          <Link href={`/clients/${clientId}`} className="ui-link">
            ← {t("googleBackToCampaigns")}
          </Link>
        }
        title={t("googleKeywordsExplorerTitle")}
      />
      <ClientGoogleKeywords clientId={clientId} />
    </div>
  );
}
