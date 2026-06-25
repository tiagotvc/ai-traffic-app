"use client";

import { useRef, useState } from "react";
import {
  Check,
  Copy,
  Filter,
  Globe,
  GlobeLock,
  LayoutTemplate,
  Plus,
  Settings2,
  Tv
} from "lucide-react";
import { useTranslations } from "next-intl";

import { AppRenamePopover } from "@/components/dashboard/canvas/AppRenamePopover";
import { DashboardToolbarButton } from "@/components/dashboard/canvas/DashboardToolbarButton";
import { GlobalScopeFilters } from "@/components/layout/GlobalScopeFilters";
import { MetaSyncButton } from "@/components/layout/MetaSyncButton";
import { useCommandStripOptional } from "@/components/layout/CommandStripContext";
import { useDismissOnOutsideClick } from "@/hooks/useDismissOnOutsideClick";

export function DashboardToolbarActions({
  saving,
  onTvToggle,
  onTemplatesOpen,
  onAddWidget,
  onDoneEditing,
  onCustomize,
  editMode,
  applyingTemplate,
  hasWidgetPeriodOverrides,
  appBuilderMode = false,
  highlightsMode = false,
  appName,
  appSubtitle,
  onUpdateAppMeta,
  published = false,
  viewToken,
  publishing = false,
  onPublishToggle
}: {
  saving?: boolean;
  onTvToggle: () => void;
  onTemplatesOpen: () => void;
  onAddWidget: () => void;
  onDoneEditing: () => void;
  onCustomize: () => void;
  editMode: boolean;
  allowAiBuilder?: boolean;
  applyingTemplate?: boolean;
  hasWidgetPeriodOverrides: boolean;
  /** App canvas — sem filtros globais; o usuário adiciona blocos no canvas. */
  appBuilderMode?: boolean;
  /** Destaques home canvas — esconde templates, TV e publish. */
  highlightsMode?: boolean;
  appName?: string;
  appSubtitle?: string | null;
  onUpdateAppMeta?: (patch: { name?: string; subtitle?: string | null }) => void;
  published?: boolean;
  viewToken?: string | null;
  publishing?: boolean;
  onPublishToggle?: (published: boolean) => void;
}) {
  const t = useTranslations("dashboard");
  const tApps = useTranslations("dashboardViews");
  const tW = useTranslations("dashboardWidgets");
  const strip = useCommandStripOptional();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);
  const renameRef = useRef<HTMLDivElement>(null);

  const filtersActive = Boolean(
    strip &&
      (strip.clientFilter || strip.accountFilter || strip.period.preset !== "last30")
  );
  const filterBtnActive = filtersOpen || filtersActive;

  useDismissOnOutsideClick(filtersRef, filtersOpen, () => setFiltersOpen(false));
  useDismissOnOutsideClick(renameRef, renameOpen, () => setRenameOpen(false));

  async function copyViewLink() {
    if (!viewToken || typeof window === "undefined") return;
    const url = `${window.location.origin}/views/${viewToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div ref={filtersRef} className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
        {!appBuilderMode && strip ? (
          <DashboardToolbarButton
            icon={<Filter size={14} />}
            label={t("filtersTitle")}
            aria-pressed={filtersOpen}
            onClick={() => setFiltersOpen((v) => !v)}
            style={{
              background: filterBtnActive ? "rgba(124,58,237,0.1)" : "var(--surface-card)",
              borderColor: filterBtnActive ? "rgba(124,58,237,0.35)" : "var(--border-color)",
              color: filterBtnActive ? "#a78bfa" : "var(--text-dim)"
            }}
          />
        ) : null}

        {!highlightsMode ? (
          <DashboardToolbarButton
            icon={<Tv size={14} />}
            label={tW("toolbarTvLabel")}
            onClick={onTvToggle}
            style={{ color: "var(--text-dim)" }}
          />
        ) : null}

        {!editMode && !appBuilderMode && !highlightsMode ? (
          <DashboardToolbarButton
            icon={<LayoutTemplate size={14} />}
            label={tW("templatesButton")}
            onClick={onTemplatesOpen}
            disabled={applyingTemplate || saving}
            style={{ color: "var(--text-dim)" }}
          />
        ) : null}

        {!editMode && appBuilderMode && !highlightsMode && onPublishToggle ? (
          published && viewToken ? (
            <>
              <DashboardToolbarButton
                icon={<Copy size={14} />}
                label={copied ? tApps("linkCopied") : tApps("copyViewLink")}
                onClick={() => void copyViewLink()}
                style={{ color: "#22c55e", borderColor: "rgba(34,197,94,0.35)" }}
              />
              <DashboardToolbarButton
                icon={<GlobeLock size={14} />}
                label={publishing ? tApps("unpublishing") : tApps("unpublishView")}
                disabled={publishing}
                onClick={() => onPublishToggle(false)}
                style={{ color: "var(--text-dim)" }}
              />
            </>
          ) : (
            <DashboardToolbarButton
              icon={<Globe size={14} />}
              label={publishing ? tApps("publishing") : tApps("publishView")}
              disabled={publishing}
              onClick={() => onPublishToggle(true)}
              style={{
                borderColor: "rgba(34,197,94,0.35)",
                background: "rgba(34,197,94,0.08)",
                color: "#22c55e"
              }}
            />
          )
        ) : null}

        {editMode ? (
          <>
            {appBuilderMode && onUpdateAppMeta && appName ? (
              <div ref={renameRef} className="relative">
                <DashboardToolbarButton
                  icon={<Settings2 size={14} />}
                  label={tW("renameApp")}
                  onClick={() => setRenameOpen((v) => !v)}
                  style={{ color: "var(--text-dim)" }}
                />
                {renameOpen ? (
                  <AppRenamePopover
                    name={appName}
                    subtitle={appSubtitle ?? null}
                    saving={saving}
                    onUpdateMeta={onUpdateAppMeta}
                  />
                ) : null}
              </div>
            ) : !appBuilderMode ? (
              <DashboardToolbarButton
                icon={<Plus size={14} />}
                label={tW("addBlock")}
                onClick={onAddWidget}
                className="text-white"
                style={{ background: "#4f46e5", borderColor: "transparent", color: "#fff" }}
              />
            ) : null}
            <DashboardToolbarButton
              icon={<Check size={14} />}
              label={saving ? tW("savingLayout") : tW("doneEditingApp")}
              disabled={saving}
              onClick={onDoneEditing}
              style={{ color: "var(--text-main)" }}
            />
          </>
        ) : (
          <DashboardToolbarButton
            icon={<Settings2 size={14} />}
            label={highlightsMode ? t("layoutCustomize") : t("layoutCustomizeApp")}
            onClick={onCustomize}
            style={{
              borderColor: "rgba(124,58,237,0.3)",
              background: "rgba(124,58,237,0.08)",
              color: "#a78bfa"
            }}
          />
        )}

        {!appBuilderMode ? (
          <MetaSyncButton clientFilter={strip?.clientFilter} variant="toolbar" />
        ) : null}
      </div>

      {!appBuilderMode && filtersOpen && strip ? (
        <div
          className="w-full min-w-[280px] max-w-xl rounded-xl border p-3 shadow-sm"
          style={{ borderColor: "var(--border-color)", background: "var(--surface-card)" }}
        >
          <GlobalScopeFilters
            clientFilter={strip.clientFilter}
            setClientFilter={strip.setClientFilter}
            accountFilter={strip.accountFilter}
            setAccountFilter={strip.setAccountFilter}
            period={strip.period}
            setPeriod={strip.setPeriod}
            clientOptions={strip.clientOptions}
            adAccounts={strip.adAccounts}
            periodFilterDisabled={hasWidgetPeriodOverrides}
            periodFilterDisabledHint={
              hasWidgetPeriodOverrides ? t("periodFilterWidgetOverride") : undefined
            }
            compact
          />
        </div>
      ) : null}
    </div>
  );
}
