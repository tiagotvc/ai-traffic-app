"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

export type CreativeMemoryTab = "learnings" | "suggestions";

export function creativeMemoryTabHref(tab: CreativeMemoryTab, clientSlug: string): string {
  return `/creative-memory?client=${encodeURIComponent(clientSlug)}&tab=${tab}`;
}

export function CreativeMemoryTabs({
  clientSlug,
  activeTab
}: {
  clientSlug: string;
  activeTab: CreativeMemoryTab;
}) {
  const t = useTranslations("creativeMemory");

  const tabs: Array<{ id: CreativeMemoryTab; label: string }> = [
    { id: "learnings", label: t("tabLearnings") },
    { id: "suggestions", label: t("tabSuggestions") }
  ];

  return (
    <div className="flex gap-1 overflow-x-auto border-b border-[var(--border-color)]">
      {tabs.map((item) => {
        const isActive = activeTab === item.id;
        const tabClass = `whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium ${
          isActive
            ? "border-[var(--violet)] text-[var(--violet)]"
            : "border-transparent text-[var(--text-dim)] hover:text-[var(--text-dim)]"
        }`;

        return (
          <Link
            key={item.id}
            href={creativeMemoryTabHref(item.id, clientSlug)}
            className={tabClass}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
