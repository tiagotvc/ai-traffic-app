import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { AppLegalPageRenderer } from "@/components/legal/AppLegalPageRenderer";
import { AppInstitutionalShell } from "@/components/legal/AppInstitutionalShell";
import { getPrivacyContent } from "@/lib/marketing/legal-content";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing");
  return { title: t("privacyMetaTitle"), description: t("privacyMetaDescription") };
}

export default async function AppPrivacyPage() {
  const locale = await getLocale();
  const content = getPrivacyContent(locale);

  return (
    <AppInstitutionalShell>
      <AppLegalPageRenderer content={content} />
    </AppInstitutionalShell>
  );
}
