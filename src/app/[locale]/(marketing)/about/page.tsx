import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { UxThemeProvider } from "@/uxpilot-ui/adapters/ThemeProvider";
import AboutContent from "@/uxpilot-ui/pages/content/About";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing");
  return { title: t("aboutMetaTitle"), description: t("aboutMetaDescription") };
}

export default function MarketingAboutPage() {
  return (
    <UxThemeProvider>
      <div data-theme="light" className="bg-[var(--surface-bg)]">
        <AboutContent />
      </div>
    </UxThemeProvider>
  );
}
