"use client";

import { Lightbulb } from "lucide-react";
import { useTranslations } from "next-intl";

import { DsPageHeader } from "@/design-system";

export function BrainFeedHeader() {
  const t = useTranslations("brainInsights");

  return (
    <DsPageHeader
      className="mb-0"
      title={t("feedTitle")}
      subtitle={t("feedHowItWorks")}
      titleIcon={<Lightbulb size={16} aria-hidden />}
    />
  );
}
