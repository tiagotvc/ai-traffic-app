import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { MarketingAbout } from "@/components/marketing/MarketingAbout";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing");
  return { title: t("aboutMetaTitle"), description: t("aboutMetaDescription") };
}

export default function MarketingAboutPage() {
  return <MarketingAbout />;
}
