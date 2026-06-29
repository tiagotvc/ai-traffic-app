"use client";

import { useRef } from "react";
import { MapPin, X } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  AiZoneForm,
  type AiZoneFormHandle
} from "@/components/audiences/create/AiZoneForm";
import { PageTitleBlock } from "@/design-system/components/PageTitleBlock";
import { Link, useRouter } from "@/i18n/navigation";

export function ManualZoneCreatorUxPage() {
  const t = useTranslations("audiences");
  const tCc = useTranslations("campaignCreator");
  const router = useRouter();
  const formRef = useRef<AiZoneFormHandle>(null);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="campaign-creator-header shrink-0 px-4 pb-3 pt-3 lg:pl-8 lg:pr-4 lg:pb-4 lg:pt-4">
        <div className="flex items-start justify-between gap-3">
          <PageTitleBlock
            className="flex-1"
            title={t("zoneCreatorTitle")}
            subtitle={
              <>
                <Link href="/audiences/zones" className="hover:underline">
                  {t("zonesLibraryTitle")}
                </Link>
                {" › "}
                {t("newZone")}
              </>
            }
            titleIcon={<MapPin size={16} aria-hidden />}
          />
          <button
            type="button"
            onClick={() => router.push("/audiences/zones")}
            aria-label={tCc("close")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-opacity hover:opacity-80 lg:h-8 lg:w-8"
          >
            <X size={20} strokeWidth={2} className="text-[var(--text-dim)]" />
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 lg:pl-8 lg:pr-4">
        <div className="campaign-creator-section-stack space-y-4 pt-5">
          <AiZoneForm
            ref={formRef}
            embedded
            compactLayout
            onClose={() => router.push("/audiences/zones")}
            onSaved={() => {
              router.push("/audiences/zones");
              router.refresh();
            }}
          />
        </div>
      </div>
    </div>
  );
}
