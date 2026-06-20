"use client";

import { useLocale, useTranslations } from "next-intl";

import { formatBrainCreatedAt } from "@/lib/agency-brain/format-created-at";

export function CreatedAtMeta({
  createdAt,
  updatedAt,
  className = ""
}: {
  createdAt: string;
  updatedAt?: string | null;
  className?: string;
}) {
  const locale = useLocale();
  const t = useTranslations("agencyBrain");

  const createdLabel = formatBrainCreatedAt(createdAt, locale);
  const showUpdated =
    updatedAt != null && new Date(updatedAt).getTime() > new Date(createdAt).getTime();
  const updatedLabel = showUpdated ? formatBrainCreatedAt(updatedAt, locale) : null;

  if (!createdLabel && !updatedLabel) return null;

  return (
    <div className={`text-xs text-[var(--text-dimmer)] ${className}`.trim()}>
      {createdLabel ? <span>{createdLabel}</span> : null}
      {updatedLabel ? (
        <span className="block text-[11px] text-[var(--text-dimmer)]">
          {t("createdAtUpdated", { date: updatedLabel })}
        </span>
      ) : null}
    </div>
  );
}
