import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { MarketingDataDeletion } from "@/components/marketing/MarketingDataDeletion";
import { buildAlternates } from "@/lib/seo";

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("marketing");
  return {
    title: t("dataDeletionMetaTitle"),
    description: t("dataDeletionMetaDescription"),
    alternates: buildAlternates(locale, "/data-deletion")
  };
}

export default async function DataDeletionPage({
  searchParams
}: {
  searchParams: Promise<{ confirmation?: string }>;
}) {
  const { confirmation } = await searchParams;
  return <MarketingDataDeletion confirmationCode={confirmation?.trim() || null} />;
}
