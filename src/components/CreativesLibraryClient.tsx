"use client";

import { useTranslations } from "next-intl";

import { CreativesLibraryView } from "@/components/creatives/CreativesLibraryView";
import { Link } from "@/i18n/navigation";

export function CreativesLibraryClient() {
  const t = useTranslations("creatives");

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">{t("breadcrumb")}</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-slate-900">
            <span className="text-violet-600">📢</span>
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="ui-btn-secondary">
            {t("export")}
          </button>
          <Link href="/ads/new" className="ui-btn-primary">
            {t("newCreative")}
          </Link>
        </div>
      </div>

      <CreativesLibraryView fetchUrl="/api/creatives/library" translationNs="creatives" />
    </div>
  );
}
