import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { MarketingSupport } from "@/components/marketing/MarketingSupport";
import { buildAlternates } from "@/lib/seo";

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("marketing");
  return {
    title: t("supportMetaTitle"),
    description: t("supportMetaDescription"),
    alternates: buildAlternates(locale, "/support")
  };
}

export default function MarketingSupportPage() {
  return <MarketingSupport />;
}
