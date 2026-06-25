"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4"
      onMouseDown={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-card)] shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border-color)] px-5 py-4">
          <div>
            <h2 className="font-heading text-base font-semibold text-[var(--text-main)]">{content.title}</h2>
            {content.subtitle ? (
              <p className="mt-0.5 text-xs text-[var(--text-dim)]">{content.subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[var(--text-dimmer)] transition-colors hover:bg-[var(--surface-bg)]"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 text-sm leading-relaxed text-[var(--text-dim)]">
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
      </div>
    </div>
  );
}
