"use client";

import { useTranslations } from "next-intl";

import { CampaignTableColumnsModal } from "@/components/CampaignTableColumnsModal";
import type { useCampaignTableLayout } from "@/hooks/useCampaignTableLayout";

type LayoutHook = ReturnType<typeof useCampaignTableLayout>;

export function CampaignTableColumnsButton({
  className,
  layout
}: {
  className?: string;
  layout: LayoutHook;
}) {
  const t = useTranslations("campaignTableLayout");

  return (
    <>
      <button
        type="button"
        onClick={() => layout.setModalOpen(true)}
        className={className ?? "ui-btn-secondary text-xs"}
        title={t("columnsTitle")}
      >
        <span aria-hidden>⚙</span> {t("columnsTitle")}
      </button>
      <CampaignTableColumnsModal
        open={layout.modalOpen}
        onClose={() => layout.setModalOpen(false)}
        layout={layout}
      />
    </>
  );
}
