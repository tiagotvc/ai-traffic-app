"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

export type ClientDetailTab = "overview" | "agency-brain" | "settings";

export function clientTabHref(tab: ClientDetailTab, clientSlug: string): string {
  switch (tab) {
    case "overview":
      return `/clients/${clientSlug}`;
    case "agency-brain":
      return `/clients/${clientSlug}/agency-brain`;
    case "settings":
      return `/clients/${clientSlug}/settings`;
    default:
      return `/clients/${clientSlug}`;
  }
}

export function ClientDetailTabs({
  clientSlug,
  activeTab
}: {
  clientSlug: string;
  activeTab: ClientDetailTab;
}) {
  const t = useTranslations("agencyBrain");

  const tabs: Array<{ id: ClientDetailTab; label: string }> = [
    { id: "overview", label: t("tabOverview") },
    { id: "agency-brain", label: t("tabAgencyBrain") },
    { id: "settings", label: t("tabSettings") }
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
          <Link key={item.id} href={clientTabHref(item.id, clientSlug)} className={tabClass}>
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
