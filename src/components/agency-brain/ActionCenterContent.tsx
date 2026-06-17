"use client";

import { useTranslations } from "next-intl";

import { ActionCenterAlerts } from "@/components/agency-brain/ActionCenterAlerts";
import { SuggestionsContent } from "@/components/suggestions/SuggestionsContent";

export function ActionCenterContent({ clientId }: { clientId: string }) {
  const t = useTranslations("actionCenter");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900">{t("title")}</h2>
        <p className="text-sm text-slate-500">{t("subtitle")}</p>
      </div>
      <ActionCenterAlerts clientId={clientId} />
      <SuggestionsContent clientId={clientId} />
    </div>
  );
}
