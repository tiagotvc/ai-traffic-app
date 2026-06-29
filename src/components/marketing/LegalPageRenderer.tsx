import type { ReactNode } from "react";

import {
  MarketingContentCard,
  MarketingContentPage,
  MarketingContentSection
} from "@/components/marketing/MarketingContentPage";
import type { LegalPageContent, LegalSection } from "@/lib/marketing/legal-content/types";

const URL_RE = /(https?:\/\/[^\s]+)/g;

/** Transforma URLs no texto em links clicáveis (externos). */
function linkify(text: string): ReactNode {
  const parts = text.split(URL_RE);
  if (parts.length === 1) return text;
  return parts.map((part, i) => {
    if (!/^https?:\/\//.test(part)) return <span key={i}>{part}</span>;
    const trailing = part.match(/[.,;:)\]]+$/)?.[0] ?? "";
    const url = trailing ? part.slice(0, -trailing.length) : part;
    return (
      <span key={i}>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all text-[var(--ui-accent)] underline underline-offset-2 hover:opacity-80"
        >
          {url}
        </a>
        {trailing}
      </span>
    );
  });
}

function SectionBody({ section }: { section: LegalSection }) {
  return (
    <>
      {section.paragraphs.map((paragraph, index) => (
        <p key={index} className={index > 0 ? "mt-3" : undefined}>
          {linkify(paragraph)}
        </p>
      ))}
      {section.bullets?.length ? (
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          {section.bullets.map((item) => (
            <li key={item}>{linkify(item)}</li>
          ))}
        </ul>
      ) : null}
      {section.tail?.map((paragraph, index) => (
        <p key={`tail-${index}`} className="mt-3">
          {linkify(paragraph)}
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
