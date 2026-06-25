"use client";

import { useTranslations } from "next-intl";
import { ChevronLeft } from "lucide-react";

import { Link } from "@/i18n/navigation";

export function DashboardLayoutHeader({
  activeLayoutName,
  activeLayoutSubtitle,
  editMode
}: {
  activeLayoutName: string;
  activeLayoutSubtitle: string | null;
  editMode: boolean;
  saving?: boolean;
  onUpdateMeta?: (patch: { name?: string; subtitle?: string | null }) => void;
}) {
  const tApps = useTranslations("dashboardApps");

  return (
    <div className="min-w-0 flex-1">
      <Link
        href="/dashboard/views"
        className="inline-flex items-center gap-1 text-xs font-medium transition-colors hover:text-[#a78bfa]"
        style={{ color: "var(--text-dimmer)" }}
      >
        <ChevronLeft size={14} />
        {tApps("backToApps")}
      </Link>

      {!editMode ? (
        <>
          <h1
            className="mt-0.5 truncate font-heading text-xl font-bold sm:text-2xl"
            style={{ color: "var(--text-main)" }}
          >
            {activeLayoutName}
          </h1>
          {activeLayoutSubtitle ? (
            <p className="mt-0.5 font-body text-sm" style={{ color: "var(--text-dim)" }}>
              {activeLayoutSubtitle}
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
