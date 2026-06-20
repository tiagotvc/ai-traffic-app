"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

export type ClientDetailTab = "overview" | "settings";

export function clientTabHref(tab: ClientDetailTab, clientSlug: string): string {
  switch (tab) {
    case "overview":
      return `/clients/${clientSlug}`;
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
    { id: "settings", label: t("tabSettings") }
  ];

  return (
    <div className="flex gap-1 overflow-x-auto border-b" style={{ borderColor: "var(--border-color)" }}>
      {tabs.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <Link
            key={item.id}
            href={clientTabHref(item.id, clientSlug)}
            className="whitespace-nowrap rounded-t-lg px-4 py-2 font-body text-sm font-medium transition-all"
            style={{
              background: isActive ? "#f5a623" : "transparent",
              color: isActive ? "#0f1419" : "var(--text-dim)",
              border: isActive ? "1px solid #f5a623" : "1px solid transparent",
              fontWeight: isActive ? 600 : 400
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
