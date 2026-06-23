import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { MarketingPrivacy } from "@/components/marketing/MarketingPrivacy";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing");
  return { title: t("privacyMetaTitle"), description: t("privacyMetaDescription") };
}

export default function MarketingPrivacyPage() {
  return <MarketingPrivacy />;
}
