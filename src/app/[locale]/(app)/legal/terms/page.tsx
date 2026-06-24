import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { AppLegalPageRenderer } from "@/components/legal/AppLegalPageRenderer";
import { AppInstitutionalShell } from "@/components/legal/AppInstitutionalShell";
import { getTermsContent } from "@/lib/marketing/legal-content";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing");
  return { title: t("termsMetaTitle"), description: t("termsMetaDescription") };
}

export default async function AppTermsPage() {
  const locale = await getLocale();
  const content = getTermsContent(locale);

  return (
    <AppInstitutionalShell>
      <AppLegalPageRenderer content={content} />
    </AppInstitutionalShell>
  );
}
