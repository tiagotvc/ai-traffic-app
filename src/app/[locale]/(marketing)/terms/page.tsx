import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { UxThemeProvider } from "@/uxpilot-ui/adapters/ThemeProvider";
import TermsContent from "@/uxpilot-ui/pages/content/Terms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing");
  return { title: t("termsMetaTitle"), description: t("termsMetaDescription") };
}

export default function MarketingTermsPage() {
  return (
    <UxThemeProvider>
      <div data-theme="light" className="bg-[var(--surface-bg)]">
        <TermsContent />
      </div>
    </UxThemeProvider>
  );
}
