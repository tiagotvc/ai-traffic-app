import { getLocale } from "next-intl/server";

import { LegalPageRenderer } from "@/components/marketing/LegalPageRenderer";
import { getPrivacyContent } from "@/lib/marketing/legal-content";

export async function MarketingPrivacy() {
  const locale = await getLocale();
  const content = getPrivacyContent(locale);
  return <LegalPageRenderer content={content} />;
}
