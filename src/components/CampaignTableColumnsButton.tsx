"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

export function CampaignTableColumnsButton({ className }: { className?: string }) {
  const t = useTranslations("campaignTableLayout");

  return (
    <Link
      href="/campaigns/columns"
      className={className ?? "ui-btn-secondary text-xs"}
      title={t("columnsTitle")}
    >
      <span aria-hidden>⚙</span> {t("columnsTitle")}
    </Link>
  );
}
