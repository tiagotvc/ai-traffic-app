"use client";

import { useTranslations } from "next-intl";

import { AudiencesLookalikeClient } from "@/components/AudiencesLookalikeClient";

export function MetaAudiencesFeatureClient() {
  const t = useTranslations("audiences");

  return (
    <div className="space-y-4">
      <div
        className="rounded-xl border px-4 py-3 text-sm font-body"
        style={{
          background: "rgba(139,92,246,0.06)",
          borderColor: "rgba(139,92,246,0.25)",
          color: "var(--text-dim)"
        }}
      >
        <span
          className="mr-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium"
          style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa" }}
        >
          {t("metaFeatureBadge")}
        </span>
        {t("metaFeatureHint")}
      </div>
      <AudiencesLookalikeClient useUxChrome />
    </div>
  );
}
