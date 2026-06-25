"use client";

import { DsModal } from "@/design-system";
import { getPrivacyContent, getTermsContent } from "@/lib/marketing/legal-content";

export type LegalModalType = "terms" | "privacy";

/** Abre Termos de Uso ou Política de Privacidade em um modal (usado no login). */
export function LegalModal({
  type,
  locale,
  onClose
}: {
  type: LegalModalType;
  locale: string;
  onClose: () => void;
}) {
  const content = type === "terms" ? getTermsContent(locale) : getPrivacyContent(locale);

  return (
    <DsModal open onClose={onClose} title={content.title} subtitle={content.subtitle} width="lg">
      <div className="space-y-4 text-sm leading-relaxed text-[var(--text-dim)]">
        {content.intro ? <p>{content.intro}</p> : null}
        {content.sections.map((section) => (
          <section key={section.title} className="space-y-2">
            <h3 className="font-heading text-sm font-semibold text-[var(--text-main)]">{section.title}</h3>
            {section.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            {section.bullets?.length ? (
              <ul className="list-disc space-y-1 pl-5">
                {section.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            ) : null}
            {section.tail?.map((p, i) => (
              <p key={`tail-${i}`}>{p}</p>
            ))}
          </section>
        ))}
        {content.footerNote ? (
          <p className="text-xs text-[var(--text-dimmer)]">{content.footerNote}</p>
        ) : null}
      </div>
    </DsModal>
  );
}
