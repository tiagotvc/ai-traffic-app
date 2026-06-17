"use client";

import { useTranslations } from "next-intl";

import { SettingsOutlineIcon } from "@/components/ui/OutlineIcon";
import { Link } from "@/i18n/navigation";

export function CampaignTableColumnsButton({ className }: { className?: string }) {
  const t = useTranslations("campaignTableLayout");

  return (
    <Link
      href="/campaigns/columns"
      className={className ?? "ui-btn-secondary inline-flex items-center gap-1.5 text-xs"}
      title={t("columnsTitle")}
    >
      <SettingsOutlineIcon className="h-4 w-4" />
      {t("columnsTitle")}
    </Link>
  );
}
