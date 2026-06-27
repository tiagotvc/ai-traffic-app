"use client";

import { MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { CreatorModalShell } from "@/components/campaign-creator/CreatorModalShell";
import { GeoRadiusPinList } from "@/components/campaign-creator/GeoRadiusPinList";
import type { TargetingItem } from "@/lib/campaign-draft";

type MarkedAreasModalProps = {
  open: boolean;
  onClose: () => void;
  pins: TargetingItem[];
  onUpdateRadius: (value: string, radius: number) => void;
  onRemove: (value: string) => void;
};

export function MarkedAreasModal({
  open,
  onClose,
  pins,
  onUpdateRadius,
  onRemove
}: MarkedAreasModalProps) {
  const t = useTranslations("campaignCreator");
  const [selectedPin, setSelectedPin] = useState<string | null>(null);

  return (
    <CreatorModalShell
      open={open}
      onClose={onClose}
      title={t("mapPinsList")}
      subtitle={t("mapSectionHint")}
      titleIcon={<MapPin size={18} />}
      width="md"
      hideFooter
    >
      <GeoRadiusPinList
        pins={pins}
        selectedPin={selectedPin}
        onSelectPin={setSelectedPin}
        onUpdateRadius={onUpdateRadius}
        onRemove={onRemove}
      />
    </CreatorModalShell>
  );
}
