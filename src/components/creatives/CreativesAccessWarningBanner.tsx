"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import type {
  CreativeAccessSuggestedAction,
  CreativeAccessWarning
} from "@/lib/creatives-access-types";

export type { CreativeAccessWarning };

export function CreativesAccessWarningBanner({
  warnings,
  partialData = false
}: {
  warnings: CreativeAccessWarning[];
  partialData?: boolean;
}) {
  const t = useTranslations("creativesPerf");

  if (!warnings.length) return null;

  function actionLabel(action: CreativeAccessSuggestedAction) {
    if (action === "invite_colleague") return t("accessActionInviteColleague");
    if (action === "retry_later") return t("accessActionRetryLater");
    return t("accessActionReconnect");
  }

  function bodyForWarning(w: CreativeAccessWarning) {
    if (w.code === "ACCOUNT_NOT_GRANTED") return t("accessWarningNotGranted");
    if (w.code === "NO_TOKEN") return t("accessWarningNoToken");
    if (w.code === "TOKEN_EXPIRED") return t("accessWarningTokenExpired");
    if (w.code === "RATE_LIMIT") return t("accessWarningRateLimit");
    return t("accessWarningBody");
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p className="font-medium">{t("accessWarningTitle")}</p>
      {partialData ? (
        <p className="mt-1 text-xs text-amber-800">{t("accessWarningPartialData")}</p>
      ) : null}
      <ul className="mt-2 space-y-2">
        {warnings.map((w) => (
          <li key={w.account} className="rounded-lg border border-amber-100 bg-white/60 px-3 py-2">
            <div className="font-medium">{w.label}</div>
            <p className="mt-0.5 text-xs text-amber-800">{bodyForWarning(w)}</p>
            {w.suggestedAction === "reconnect_meta" ? (
              <Link
                href="/settings/meta-assets?reconnect=1"
                className="mt-1.5 inline-flex text-xs font-semibold text-violet-700 hover:text-violet-600"
              >
                {actionLabel(w.suggestedAction)} →
              </Link>
            ) : (
              <span className="mt-1.5 block text-xs font-medium text-amber-700">
                {actionLabel(w.suggestedAction)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
