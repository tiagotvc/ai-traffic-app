import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { MarketingTerms } from "@/components/marketing/MarketingTerms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing");
  return { title: t("termsMetaTitle"), description: t("termsMetaDescription") };
}

export default function TermsPage() {
  return <MarketingTerms />;
}
