import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { MarketingTerms } from "@/components/marketing/MarketingTerms";
import { buildAlternates } from "@/lib/seo";

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("marketing");
  return {
    title: t("termsMetaTitle"),
    description: t("termsMetaDescription"),
    alternates: buildAlternates(locale, "/terms")
  };
}

export default function TermsPage() {
  return <MarketingTerms />;
}
