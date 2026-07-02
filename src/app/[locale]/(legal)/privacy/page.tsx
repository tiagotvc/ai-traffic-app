import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { MarketingPrivacy } from "@/components/marketing/MarketingPrivacy";
import { buildAlternates } from "@/lib/seo";

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("marketing");
  return {
    title: t("privacyMetaTitle"),
    description: t("privacyMetaDescription"),
    alternates: buildAlternates(locale, "/privacy")
  };
}

export default function PrivacyPage() {
  return <MarketingPrivacy />;
}
