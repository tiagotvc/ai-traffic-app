import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { MarketingAbout } from "@/components/marketing/MarketingAbout";
import { buildAlternates } from "@/lib/seo";

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("marketing");
  return {
    title: t("aboutMetaTitle"),
    description: t("aboutMetaDescription"),
    alternates: buildAlternates(locale, "/about")
  };
}

export default function MarketingAboutPage() {
  return <MarketingAbout />;
}
