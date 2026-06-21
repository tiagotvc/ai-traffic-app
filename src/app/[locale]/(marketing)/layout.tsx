import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { MarketingShell } from "@/components/marketing/MarketingShell";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing");
  return {
    title: t("metaTitle"),
    description: t("metaDescription")
  };
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <MarketingShell>{children}</MarketingShell>;
}
