import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AppInstitutionalAbout } from "@/components/legal/AppInstitutionalAbout";
import { AppInstitutionalShell } from "@/components/legal/AppInstitutionalShell";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing");
  return { title: t("aboutMetaTitle"), description: t("aboutMetaDescription") };
}

export default function AppAboutPage() {
  return (
    <AppInstitutionalShell>
      <AppInstitutionalAbout />
    </AppInstitutionalShell>
  );
}
