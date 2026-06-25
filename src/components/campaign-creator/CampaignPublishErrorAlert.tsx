"use client";

import { useTranslations } from "next-intl";

type Props = {
  message: string;
  showFixLink?: boolean;
  onFix?: () => void;
  className?: string;
};

export function CampaignPublishErrorAlert({
  message,
  showFixLink,
  onFix,
  className = ""
}: Props) {
  const t = useTranslations("campaignCreator");

  return (
    <div className={`rounded-lg border border-red-200 bg-red-50/80 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200 ${className}`}>
      <p className="leading-relaxed">{message}</p>
      {showFixLink && onFix ? (
        <button
          type="button"
          className="ui-link-amber mt-2 font-semibold"
          onClick={onFix}
        >
          {t("personaTargetingFixNow")}
        </button>
      ) : null}
    </div>
  );
}
