import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AppInstitutionalSupport } from "@/components/legal/AppInstitutionalSupport";
import { AppInstitutionalShell } from "@/components/legal/AppInstitutionalShell";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing");
  return { title: t("supportMetaTitle"), description: t("supportMetaDescription") };
}

export default function AppSupportPage() {
  return (
    <AppInstitutionalShell>
      <AppInstitutionalSupport />
    </AppInstitutionalShell>
  );
}
