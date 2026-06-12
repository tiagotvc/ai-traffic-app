"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function BillingGateModal({
  planSlug,
  status
}: {
  planSlug: string;
  status: string;
}) {
  const t = useTranslations("billingPage");

  if (status !== "past_due" && status !== "suspended") return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-slate-900">
          {status === "suspended" ? t("modalSuspendedTitle") : t("modalPastDueTitle")}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          {status === "suspended" ? t("modalSuspendedBody") : t("modalPastDueBody")}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/billing" className="ui-btn-primary text-sm">
            {t("regularize")}
          </Link>
          {planSlug === "free" ? (
            <Link href="/billing/plans" className="ui-btn-secondary text-sm">
              {t("viewPlans")}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
