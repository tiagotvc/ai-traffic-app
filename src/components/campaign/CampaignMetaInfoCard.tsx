"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { formatBRL } from "@/lib/format";
import type { DrilldownCampaign } from "@/lib/campaign-drilldown-cache";

function MetaField({
  label,
  children,
  className = ""
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-semibold text-[var(--text-main)]">{children}</dd>
    </div>
  );
}

/** Card informativo com metadados da campanha (estilo alerta temático). */
export function CampaignMetaInfoCard({
  campaign,
  locale,
  translationNs = "campaignManager"
}: {
  campaign: DrilldownCampaign;
  locale: string;
  translationNs?: "campaignManager" | "adsetsPage" | "adsPage" | "creativesPage";
}) {
  const t = useTranslations(translationNs);

  return (
    <dl className="ui-alert-info ui-campaign-meta-card grid grid-cols-2 gap-x-4 gap-y-2.5 px-3 py-2.5 sm:grid-cols-3 lg:grid-cols-5">
      <MetaField label={t("client")}>
        <Link href={`/clients/${campaign.clientSlug}`} className="ui-link font-semibold hover:underline">
          {campaign.clientName}
        </Link>
      </MetaField>
      <MetaField label="ID">
        <span className="font-mono text-xs">{campaign.id}</span>
      </MetaField>
      <MetaField label={t("account")} className="col-span-2 sm:col-span-1">
        <span className="line-clamp-2 text-xs leading-snug" title={campaign.accountLabel}>
          {campaign.accountLabel}
        </span>
      </MetaField>
      <MetaField label={t("objective")}>
        <span>{campaign.objective}</span>
      </MetaField>
      <MetaField label={t("dailyBudget")}>
        {campaign.dailyBudget != null ? formatBRL(campaign.dailyBudget, locale) : "—"}
      </MetaField>
    </dl>
  );
}
