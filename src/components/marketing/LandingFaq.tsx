"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";

import { getSupportFaqs } from "@/lib/marketing/legal-content";
import { MarketingReveal } from "@/components/marketing/motion/MarketingReveal";
import { useReducedMotion } from "@/components/marketing/motion/useReducedMotion";
import { cn } from "@/lib/cn";

export function LandingFaq() {
  const t = useTranslations("marketing");
  const locale = useLocale();
  const faqs = getSupportFaqs(locale);
  const [open, setOpen] = useState<number | null>(0);
  const reduced = useReducedMotion();

  if (!faqs.length) return null;

  return (
    <section id="faq" className="marketing-section marketing-section-alt">
      <div className="mx-auto max-w-3xl">
        <MarketingReveal className="text-center">
          <p className="marketing-section-title">{t("faqBadge")}</p>
          <h2 className="marketing-section-heading">{t("faqTitle")}</h2>
        </MarketingReveal>
        <div className="mt-10 space-y-2">
          {faqs.map((faq, i) => {
            const isOpen = open === i;
            return (
              <div
                key={faq.question}
                className="marketing-card overflow-hidden p-0 transition hover:border-[var(--ui-accent-border)]"
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm font-medium text-[var(--text-main)]">{faq.question}</span>
                  <ChevronDown
                    className={cn("h-4 w-4 shrink-0 text-[var(--text-dim)] transition", isOpen && "rotate-180")}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.div
                      initial={reduced ? false : { height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={reduced ? undefined : { height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-[var(--border-color)] px-4 py-3.5 text-sm leading-relaxed text-[var(--text-dim)]">
                        {faq.answer}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
