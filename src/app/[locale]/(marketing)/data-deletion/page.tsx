import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { MarketingDataDeletion } from "@/components/marketing/MarketingDataDeletion";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing");
  return { title: t("dataDeletionMetaTitle"), description: t("dataDeletionMetaDescription") };
}

export default async function MarketingDataDeletionPage({
  searchParams
}: {
  searchParams: Promise<{ confirmation?: string }>;
}) {
  const { confirmation } = await searchParams;
  return <MarketingDataDeletion confirmationCode={confirmation?.trim() || null} />;
}
