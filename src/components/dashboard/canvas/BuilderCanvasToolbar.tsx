"use client";

import { ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";

import { DashboardToolbarActions } from "@/components/dashboard/canvas/DashboardToolbarActions";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

export function BuilderCanvasToolbar({
  appName,
  appSubtitle,
  editMode,
  saving,
  published,
  viewToken,
  publishing,
  highlightsMode = false,
  onUpdateAppMeta,
  onTvToggle,
  onDoneEditing,
  onCustomize,
  onPublishToggle
}: {
  appName: string;
  appSubtitle?: string | null;
  editMode: boolean;
  saving?: boolean;
  published?: boolean;
  viewToken?: string | null;
  publishing?: boolean;
  highlightsMode?: boolean;
  onUpdateAppMeta?: (patch: { name?: string; subtitle?: string | null }) => void;
  onTvToggle: () => void;
  onDoneEditing: () => void;
  onCustomize: () => void;
  onPublishToggle?: (published: boolean) => void;
}) {
  const tApps = useTranslations("dashboardApps");
  const tW = useTranslations("dashboardWidgets");

  return (
    <header
      className="flex h-11 shrink-0 items-center justify-between gap-3 border-b px-3"
      style={{ borderColor: "var(--border-color)", background: "var(--surface-card)" }}
    >
      <div className="flex min-w-0 items-center gap-2">
        {!highlightsMode ? (
          <Link
            href="/dashboard/views"
            className="inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-1 text-xs font-medium transition-colors hover:bg-[var(--surface-bg)] hover:text-[#a78bfa]"
            style={{ color: "var(--text-dimmer)" }}
          >
            <ChevronLeft size={14} />
            {tApps("backToApps")}
          </Link>
        ) : null}
        {!editMode ? (
          <div
            className={cn("min-w-0", !highlightsMode && "border-l pl-2")}
            style={!highlightsMode ? { borderColor: "var(--border-color)" } : undefined}
          >
            <p className="truncate font-heading text-sm font-semibold" style={{ color: "var(--text-main)" }}>
              {appName}
            </p>
            {appSubtitle ? (
              <p className="truncate text-[11px]" style={{ color: "var(--text-dim)" }}>
                {appSubtitle}
              </p>
            ) : null}
          </div>
        ) : null}
        {saving ? (
          <span className="hidden text-[11px] sm:inline" style={{ color: "#818cf8" }}>
            {tW("savingLayout")}
          </span>
        ) : null}
      </div>

      <DashboardToolbarActions
        appBuilderMode={!highlightsMode}
        highlightsMode={highlightsMode}
        saving={saving}
        appName={appName}
        appSubtitle={appSubtitle ?? null}
        onUpdateAppMeta={onUpdateAppMeta}
        onTvToggle={onTvToggle}
        onTemplatesOpen={() => {}}
        onAddWidget={() => {}}
        onDoneEditing={onDoneEditing}
        onCustomize={onCustomize}
        editMode={editMode}
        hasWidgetPeriodOverrides={false}
        published={published}
        viewToken={viewToken}
        publishing={publishing}
        onPublishToggle={onPublishToggle}
      />
    </header>
  );
}
