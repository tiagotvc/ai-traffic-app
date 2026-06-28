import type { ReactNode } from "react";

import {
  MarketingContentCard,
  MarketingContentPage,
  MarketingContentSection
} from "@/components/marketing/MarketingContentPage";
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

export function LegalPageRenderer({
  content,
  footer
}: {
  content: LegalPageContent;
  footer?: ReactNode;
}) {
  return (
    <MarketingContentPage badge={content.badge} title={content.title} subtitle={content.subtitle}>
      {content.intro ? <p className="text-center text-sm text-[var(--text-dim)]">{content.intro}</p> : null}

      <div className="space-y-4">
        {content.sections.map((section) => (
          <MarketingContentCard key={section.title}>
            <MarketingContentSection title={section.title}>
              <SectionBody section={section} />
            </MarketingContentSection>
          </MarketingContentCard>
        ))}
      </div>

      {content.footerNote ? (
        <p className="text-center text-sm text-[var(--text-dim)]">{content.footerNote}</p>
      ) : null}
      {footer}
    </MarketingContentPage>
  );
}
