import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { AppLegalPageRenderer } from "@/components/legal/AppLegalPageRenderer";
import { AppInstitutionalShell } from "@/components/legal/AppInstitutionalShell";
import { getDataDeletionContent } from "@/lib/marketing/legal-content";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing");
  return {
    title: t("dataDeletionMetaTitle"),
    description: t("dataDeletionMetaDescription")
  };
}

export default async function AppDataDeletionPage() {
  const locale = await getLocale();
  const content = getDataDeletionContent(locale);

  return (
    <AppInstitutionalShell>
      <AppLegalPageRenderer content={content} />
    </AppInstitutionalShell>
  );
}
