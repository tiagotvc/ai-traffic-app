"use client";

import { Brain } from "lucide-react";
import { useTranslations } from "next-intl";

import type { ZoneCreatorSectionKey } from "@/components/audiences/create/zone-creator-steps";

const TIP_KEYS: Record<ZoneCreatorSectionKey, string> = {
  brief: "zoneTipBrief",
  places: "zoneTipPlaces",
  review: "zoneTipReview"
};

export function ZoneCreatorBrainTips({ zoneSection }: { zoneSection: ZoneCreatorSectionKey }) {
  const t = useTranslations("audiences");

  return (
    <div className="campaign-creator-sidebar-card">
      <p className="campaign-creator-orion-section-label mb-2 inline-flex items-center gap-1.5">
        <Brain size={12} className="text-[var(--ui-accent)]" aria-hidden />
        Orion Brain
      </p>
      <p className="text-xs leading-relaxed text-[var(--text-dim)]">{t(TIP_KEYS[zoneSection])}</p>
    </div>
  );
}
