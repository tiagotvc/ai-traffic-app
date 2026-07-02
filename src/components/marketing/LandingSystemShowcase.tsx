"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { useReducedMotion } from "@/components/marketing/motion/useReducedMotion";

/** Abas de showcase do produto (referência Madgicx): pill switcher acima do frame,
 * trocando o screenshot com um fade curto. */
const SHOWCASE_TABS = [
  { key: "dashboard", labelKey: "showcaseTabDashboard", image: "/examples/dashboard.png" },
  { key: "creation", labelKey: "showcaseTabCreation", image: "/examples/manual_or_ia.png" },
  { key: "simplicity", labelKey: "showcaseTabSimplicity", image: "/examples/simple_and_intuitive.png" }
] as const;

type TabKey = (typeof SHOWCASE_TABS)[number]["key"];

export function LandingSystemShowcase() {
  const t = useTranslations("marketing");
  const reduced = useReducedMotion();
  const [active, setActive] = useState<TabKey>("dashboard");
  const activeTab = SHOWCASE_TABS.find((tab) => tab.key === active) ?? SHOWCASE_TABS[0];

  return (
    <div>
      <div
        role="tablist"
        aria-label={t("dashSectionTitle")}
        className="mx-auto flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-full border border-[var(--border-color)] bg-[var(--surface-card)] p-1.5"
      >
        {SHOWCASE_TABS.map((tab) => {
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(tab.key)}
              className={`whitespace-nowrap rounded-full px-5 py-2 text-sm font-semibold transition ${
                isActive
                  ? "bg-[var(--ui-accent)] text-[var(--ui-accent-btn-text)] shadow-[0_0_16px_var(--ui-accent-glow)]"
                  : "text-[var(--text-dim)] hover:text-[var(--text-main)]"
              }`}
            >
              {t(tab.labelKey)}
            </button>
          );
        })}
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-card)] p-2 shadow-2xl shadow-black/40 ring-1 ring-[var(--ui-accent-border)] sm:p-3">
        <AnimatePresence mode="wait" initial={false}>
          <motion.img
            key={activeTab.key}
            src={activeTab.image}
            alt={t(activeTab.labelKey)}
            className="block w-full rounded-xl"
            initial={reduced ? false : { opacity: 0.3, scale: 0.995 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduced ? undefined : { opacity: 0.3 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          />
        </AnimatePresence>
      </div>
    </div>
  );
}
