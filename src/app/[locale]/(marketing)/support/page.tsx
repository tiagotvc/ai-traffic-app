import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { UxThemeProvider } from "@/uxpilot-ui/adapters/ThemeProvider";
import SupportContent from "@/uxpilot-ui/pages/content/Support";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing");
  return { title: t("supportMetaTitle"), description: t("supportMetaDescription") };
}

export default function MarketingSupportPage() {
  return (
    <UxThemeProvider>
      <div data-theme="light" className="bg-[var(--surface-bg)]">
        <SupportContent />
      </div>
    </UxThemeProvider>
  );
}
