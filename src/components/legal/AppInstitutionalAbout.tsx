import { getLocale } from "next-intl/server";

import { AppLegalPageRenderer } from "@/components/legal/AppLegalPageRenderer";
import { getAboutContent } from "@/lib/marketing/legal-content";

export async function AppInstitutionalAbout() {
  const locale = await getLocale();
  const content = getAboutContent(locale);
  return <AppLegalPageRenderer content={content} />;
}
