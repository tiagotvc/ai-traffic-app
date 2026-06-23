import { getLocale, getTranslations } from "next-intl/server";

import { LegalPageRenderer } from "@/components/marketing/LegalPageRenderer";
import { getDataDeletionContent } from "@/lib/marketing/legal-content";

export async function MarketingDataDeletion({
  confirmationCode
}: {
  confirmationCode?: string | null;
}) {
  const locale = await getLocale();
  const t = await getTranslations("marketing");
  const content = getDataDeletionContent(locale);

  return (
    <LegalPageRenderer
      content={content}
      footer={
        confirmationCode ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4 text-center text-sm text-emerald-100/90">
            <p className="font-semibold text-emerald-200">{t("dataDeletionConfirmationTitle")}</p>
            <p className="mt-2">{t("dataDeletionConfirmationBody")}</p>
            <p className="mt-3 font-mono text-xs text-emerald-300">{confirmationCode}</p>
          </div>
        ) : null
      }
    />
  );
}
