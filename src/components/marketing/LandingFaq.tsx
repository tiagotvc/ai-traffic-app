"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";

import { getSupportFaqs } from "@/lib/marketing/legal-content";
import { cn } from "@/lib/cn";

export function LandingFaq() {
  const t = useTranslations("marketing");
  const locale = useLocale();
  const faqs = getSupportFaqs(locale);
  const [open, setOpen] = useState<number | null>(0);

  if (!faqs.length) return null;

  return (
    <section id="faq" className="border-b border-white/5 px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-400/90">
            {t("faqBadge")}
          </p>
          <h2 className="font-heading text-2xl font-bold text-white sm:text-3xl">{t("faqTitle")}</h2>
        </div>
        <div className="mt-10 space-y-2">
          {faqs.map((faq, i) => {
            const isOpen = open === i;
            return (
              <div
                key={faq.question}
                className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] transition hover:border-violet-400/20"
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm font-medium text-white">{faq.question}</span>
                  <ChevronDown
                    className={cn("h-4 w-4 shrink-0 text-violet-300/70 transition", isOpen && "rotate-180")}
                  />
                </button>
                {isOpen ? (
                  <div className="border-t border-white/10 px-4 py-3.5 text-sm leading-relaxed text-violet-200/75">
                    {faq.answer}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
