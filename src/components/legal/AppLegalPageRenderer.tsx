import type { ReactNode } from "react";

import {
  AppInstitutionalCard,
  AppInstitutionalContentPage,
  AppInstitutionalSection
} from "@/components/legal/AppInstitutionalContentPage";
import type { LegalPageContent, LegalSection } from "@/lib/marketing/legal-content/types";

function SectionBody({ section }: { section: LegalSection }) {
  return (
    <>
      {section.paragraphs.map((paragraph, index) => (
        <p key={index} className={index > 0 ? "mt-3" : undefined}>
          {paragraph}
        </p>
      ))}
      {section.bullets?.length ? (
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          {section.bullets.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
      {section.tail?.map((paragraph, index) => (
        <p key={`tail-${index}`} className="mt-3">
          {paragraph}
        </p>
      ))}
    </>
  );
}

export function AppLegalPageRenderer({
  content,
  footer
}: {
  content: LegalPageContent;
  footer?: ReactNode;
}) {
  return (
    <AppInstitutionalContentPage badge={content.badge} title={content.title} subtitle={content.subtitle}>
      {content.intro ? <p className="text-sm text-[var(--text-dim)]">{content.intro}</p> : null}

      <div className="space-y-4">
        {content.sections.map((section) => (
          <AppInstitutionalCard key={section.title}>
            <AppInstitutionalSection title={section.title}>
              <SectionBody section={section} />
            </AppInstitutionalSection>
          </AppInstitutionalCard>
        ))}
      </div>

      {content.footerNote ? (
        <p className="text-sm text-[var(--text-dim)]">{content.footerNote}</p>
      ) : null}
      {footer}
    </AppInstitutionalContentPage>
  );
}
