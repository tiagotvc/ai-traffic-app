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
    <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map((item) => {
        const isActive = activeTab === item.id;
        const tabClass = `whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium ${
          isActive
            ? "border-violet-600 text-violet-600"
            : "border-transparent text-slate-500 hover:text-slate-700"
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
