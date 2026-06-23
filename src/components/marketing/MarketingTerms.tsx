import { getLocale } from "next-intl/server";

import { LegalPageRenderer } from "@/components/marketing/LegalPageRenderer";
import { Link } from "@/i18n/navigation";
import { getTermsContent, LEGAL_CONTACT } from "@/lib/marketing/legal-content";

export async function MarketingTerms() {
  const locale = await getLocale();
  const content = getTermsContent(locale);

  return (
    <LegalPageRenderer
      content={content}
      footer={
        <p className="text-center text-sm text-violet-200/65">
          {locale === "en" ? "See also" : "Consulte também"}{" "}
          <Link href="/privacy" className="font-medium text-amber-400 hover:text-amber-300">
            {locale === "en" ? "Privacy Policy" : "Política de Privacidade"}
          </Link>
          {" · "}
          <Link href="/data-deletion" className="font-medium text-amber-400 hover:text-amber-300">
            {locale === "en" ? "Data Deletion" : "Exclusão de Dados"}
          </Link>
          {" · "}
          <a href={`mailto:${LEGAL_CONTACT.privacyEmail}`} className="font-medium text-amber-400 hover:text-amber-300">
            {LEGAL_CONTACT.privacyEmail}
          </a>
        </p>
      }
    />
  );
}
