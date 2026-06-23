import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { MarketingSupport } from "@/components/marketing/MarketingSupport";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing");
  return { title: t("supportMetaTitle"), description: t("supportMetaDescription") };
}

export default function MarketingSupportPage() {
  return <MarketingSupport />;
}
