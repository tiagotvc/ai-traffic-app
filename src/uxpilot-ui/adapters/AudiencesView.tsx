"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { MetaAudiencesFeatureClient } from "@/components/audiences/MetaAudiencesFeatureClient";
import { PersonasLibraryClient } from "@/components/audiences/PersonasLibraryClient";
import { ZonesLibraryClient } from "@/components/audiences/ZonesLibraryClient";
import { UxPageMain } from "@/uxpilot-ui/adapters/UxPageMain";

type Tab = "personas" | "zones" | "meta";

export function AudiencesView() {
  const t = useTranslations("audiences");
  const [tab, setTab] = useState<Tab>("personas");

  const tabs: { id: Tab; label: string }[] = [
    { id: "personas", label: t("tabPersonas") },
    { id: "zones", label: t("tabZones") },
    { id: "meta", label: t("tabMetaAudiences") }
  ];

  return (
    <UxPageMain className="space-y-5">
      <div className="flex flex-wrap gap-2 border-b border-[var(--border-subtle)] pb-3">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={
              tab === item.id
                ? "rounded-lg px-4 py-2 text-sm font-medium text-[var(--text-main)]"
                : "rounded-lg px-4 py-2 text-sm text-[var(--text-dim)] hover:bg-[var(--row-hover)]"
            }
            style={
              tab === item.id
                ? { background: "var(--ui-accent-muted)", borderBottom: "2px solid var(--ui-accent)" }
                : undefined
            }
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "personas" ? <PersonasLibraryClient /> : null}
      {tab === "zones" ? <ZonesLibraryClient /> : null}
      {tab === "meta" ? <MetaAudiencesFeatureClient /> : null}
    </UxPageMain>
  );
}
