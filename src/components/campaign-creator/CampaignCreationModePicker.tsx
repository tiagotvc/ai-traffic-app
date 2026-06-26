"use client";

import { useTranslations } from "next-intl";
import { PenLine, Sparkles } from "lucide-react";

import { DsChoiceCard, DsModal } from "@/design-system";

type Props = {
  open: boolean;
  onClose: () => void;
  clientSlug?: string;
};

function buildHref(mode: "manual" | "ai", clientSlug?: string) {
  const params = new URLSearchParams();
  if (clientSlug) params.set("client", clientSlug);
  if (mode === "ai") params.set("mode", "ai");
  const qs = params.toString();
  return `/campaigns/new${qs ? `?${qs}` : ""}`;
}

export function CampaignCreationModePicker({ open, onClose, clientSlug }: Props) {
  const t = useTranslations("campaignCreator.ai");

  return (
    <DsModal
      open={open}
      onClose={onClose}
      title={t("modePickerTitle")}
      subtitle={t("modePickerHint")}
      width="md"
      contentClassName="pb-5"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <DsChoiceCard
          href={buildHref("manual", clientSlug)}
          onClick={onClose}
          title={t("modeManualTitle")}
          description={t("modeManualHint")}
          icon={<PenLine size={18} />}
        />
        <DsChoiceCard
          href={buildHref("ai", clientSlug)}
          onClick={onClose}
          title={t("modeAiTitle")}
          description={t("modeAiHint")}
          icon={<Sparkles size={18} />}
          accent
        />
      </div>
    </DsModal>
  );
}
