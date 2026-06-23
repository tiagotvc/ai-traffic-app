import { getLocale } from "next-intl/server";

import { LegalPageRenderer } from "@/components/marketing/LegalPageRenderer";
import { getAboutContent } from "@/lib/marketing/legal-content";

export async function MarketingAbout() {
  const locale = await getLocale();
  const content = getAboutContent(locale);

  return <LegalPageRenderer content={content} />;
}
