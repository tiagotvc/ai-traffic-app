"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Crown, LayoutGrid, Plus, Sparkles, Star, Tv } from "lucide-react";

import { cn } from "@/lib/cn";
import { WIDGET_CATEGORY_ORDER } from "@/lib/dashboard/widget-catalog";
import {
  filterPremiumCatalog,
  getPremiumBadge,
  premiumBadgeLabelKey
} from "@/lib/dashboard/widget-premium";
import { Link } from "@/i18n/navigation";
import { usesChartBuilder, WidgetChartBuilder } from "@/components/dashboard/canvas/WidgetChartBuilder";
import { usesTaskbarBuilder, WidgetTaskbarBuilder } from "@/components/dashboard/canvas/WidgetTaskbarBuilder";
import { WidgetBuilderPreviewPanel } from "@/components/dashboard/canvas/WidgetBuilderPreviewPanel";
import { WidgetLibraryCard } from "@/components/dashboard/canvas/WidgetLibraryCard";
import { WidgetLivePreview } from "@/components/dashboard/canvas/WidgetLivePreview";
import {
  defaultWidgetConfig,
  getWidgetConfigFields,
  widgetHasConfigStep
} from "@/lib/dashboard/widget-config";
import type { useDashboardData } from "@/uxpilot-ui/adapters/useDashboardData";

type DashboardData = ReturnType<typeof useDashboardData>;

const FAVORITES_KEY = "dashboard-widget-favorites";

function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveFavorites(ids: string[]) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
}

export function WidgetLibraryModal({
  open,
  catalog,
  isPlatformAdmin = false,
  dashboardData,
  onClose,
  onAdd
}: {
  open: boolean;
  catalog: Array<{
    type: string;
    titleKey: string;
    category: string;
    allowed: boolean;
    comingSoon?: boolean;
    isAiWidget?: boolean;
    minPlan?: string;
    requiredAddon?: string;
    isMasterBlaster?: boolean;
  }>;
  isPlatformAdmin?: boolean;
  dashboardData?: DashboardData;
  onClose: () => void;
  onAdd: (widgetType: string, config?: Record<string, unknown>) => void;
}) {
  const t = useTranslations("dashboardWidgets");
  const tMetrics = useTranslations("metrics");
  const tPeriod = useTranslations("period");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("charts");
  const [favorites, setFavorites] = useState<string[]>(() => loadFavorites());
  const [configuring, setConfiguring] = useState<{
    type: string;
    titleKey: string;
    config: Record<string, unknown>;
  } | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = catalog.filter((w) => {
      const title = t(w.titleKey).toLowerCase();
      if (q && !title.includes(q) && !w.type.includes(q)) return false;
      if (category === "favorites") return favorites.includes(w.type);
      if (category === "premium") return true;
      return w.category === category;
    });
    if (category === "premium") return filterPremiumCatalog(base);
    return base;
  }, [catalog, query, category, favorites, t]);

  const premiumLockedCount = useMemo(
    () => filterPremiumCatalog(catalog).filter((w) => !w.allowed).length,
    [catalog]
  );

  if (!open) return null;

  const toggleFavorite = (type: string) => {
    setFavorites((cur) => {
      const next = cur.includes(type) ? cur.filter((x) => x !== type) : [...cur, type];
      saveFavorites(next);
      return next;
    });
  };

  const startAdd = (w: (typeof catalog)[number]) => {
    if (!w.allowed || w.comingSoon) return;
    if (widgetHasConfigStep(w.type) || usesChartBuilder(w.type)) {
      setConfiguring({
        type: w.type,
        titleKey: w.titleKey,
        config: defaultWidgetConfig(w.type)
      });
      return;
    }
    onAdd(w.type);
    onClose();
  };

  const confirmConfiguredAdd = () => {
    if (!configuring) return;
    onAdd(configuring.type, configuring.config);
    setConfiguring(null);
    onClose();
  };

  const inConfigMode = !!configuring;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div
        className={cn(
          "flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl border shadow-xl",
          inConfigMode ? "max-w-4xl" : "max-w-2xl"
        )}
        style={{ background: "var(--surface-card)", borderColor: "var(--border-color)" }}
      >
        <div className="ui-panel-header shrink-0 px-5 py-3.5">
          {inConfigMode ? (
            <div>
              <h2 className="font-heading text-base font-semibold text-[var(--text-main)]">
                {t("builderTitle", { widget: t(configuring!.titleKey) })}
              </h2>
              <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-dim)]">
                {usesTaskbarBuilder(configuring!.type)
                  ? t("taskbarBuilderHint")
                  : t("builderHint")}
              </p>
            </div>
          ) : (
            <>
              <h2 className="font-heading text-base font-semibold text-[var(--text-main)]">
                {t("libraryTitle")}
              </h2>
              <p className="mt-0.5 text-xs text-[var(--text-dim)]">{t("librarySubtitle")}</p>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("librarySearch")}
                className="ui-input mt-3"
              />
            </>
          )}
        </div>

        {inConfigMode ? (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {usesChartBuilder(configuring!.type) ? (
                <WidgetChartBuilder
                  widgetType={configuring!.type}
                  titleKey={configuring!.titleKey}
                  config={configuring!.config}
                  dashboardData={dashboardData}
                  onChange={(config) => setConfiguring((cur) => (cur ? { ...cur, config } : cur))}
                  hideHeader
                  advancedStylingUnlocked={
                    isPlatformAdmin || catalog.some((w) => w.isMasterBlaster && w.allowed)
                  }
                />
              ) : usesTaskbarBuilder(configuring!.type) ? (
                <WidgetTaskbarBuilder
                  titleKey={configuring!.titleKey}
                  config={configuring!.config}
                  dashboardData={dashboardData}
                  advancedStylingUnlocked={
                    isPlatformAdmin || catalog.some((w) => w.isMasterBlaster && w.allowed)
                  }
                  onChange={(config) => setConfiguring((cur) => (cur ? { ...cur, config } : cur))}
                />
              ) : (
                <div className="space-y-4">
                  <div className="space-y-3">
                    {(getWidgetConfigFields(configuring!.type) ?? []).map((field) => (
                      <label key={field.key} className="block">
                        <span className="ui-label mb-1.5 block">{t(field.labelKey)}</span>
                        <select
                          value={String(configuring!.config[field.key] ?? field.options[0]?.value ?? "")}
                          onChange={(e) =>
                            setConfiguring((cur) =>
                              cur ? { ...cur, config: { ...cur.config, [field.key]: e.target.value } } : cur
                            )
                          }
                          className="ui-select"
                        >
                          {field.options.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {field.key === "metricKey"
                                ? tMetrics(opt.value as import("@/lib/dashboard-metrics").MetricKey)
                                : field.key === "periodPreset" && opt.value !== "global"
                                  ? tPeriod(opt.value as import("@/lib/report-period").PeriodPreset)
                                  : t(opt.labelKey)}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                  <WidgetBuilderPreviewPanel className="rounded-xl border p-3" scrollable maxHeight={360}>
                    <WidgetLivePreview
                      widgetType={configuring!.type}
                      titleKey={configuring!.titleKey}
                      config={configuring!.config}
                      dashboardData={dashboardData}
                    />
                  </WidgetBuilderPreviewPanel>
                </div>
              )}
            </div>
            <div
              className="ui-surface flex shrink-0 justify-end gap-2 border-t px-5 py-3"
              style={{ borderColor: "var(--border-color)" }}
            >
              <button type="button" onClick={() => setConfiguring(null)} className="ui-btn-secondary">
                {t("configCancel")}
              </button>
              <button type="button" onClick={confirmConfiguredAdd} className="ui-btn-brand">
                {t("configConfirm")}
              </button>
            </div>
          </>
        ) : (
          <>
        <div className="flex min-h-0 flex-1">
          <nav
            className="hidden w-40 shrink-0 overflow-y-auto border-r p-2 sm:block"
            style={{ borderColor: "var(--border-color)" }}
          >
            {WIDGET_CATEGORY_ORDER.map((cat) => {
              const isPremium = cat === "premium";
              const active = category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={cn(
                    "mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors",
                    isPremium && !active && "border border-transparent"
                  )}
                  style={
                    active
                      ? isPremium
                        ? {
                            background: "linear-gradient(135deg, rgba(245,158,11,0.18), rgba(234,88,12,0.12))",
                            color: "#f59e0b",
                            boxShadow: "inset 0 0 0 1px rgba(245,158,11,0.35)"
                          }
                        : {
                            background: "rgba(79,70,229,0.12)",
                            color: "#818cf8"
                          }
                      : {
                          background: "transparent",
                          color: isPremium ? "#d97706" : "var(--text-dim)"
                        }
                  }
                >
                  {isPremium ? <Crown size={13} className="shrink-0" /> : null}
                  <span className="min-w-0 truncate">{t(`category_${cat}`)}</span>
                  {isPremium && premiumLockedCount > 0 ? (
                    <span
                      className="ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                      style={{ background: "rgba(245,158,11,0.2)", color: "#f59e0b" }}
                    >
                      {premiumLockedCount}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {category === "premium" ? (
              <div
                className="mb-4 overflow-hidden rounded-xl border p-4"
                style={{
                  borderColor: "rgba(245,158,11,0.25)",
                  background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(234,88,12,0.04))"
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{
                      background: "linear-gradient(135deg, #f59e0b, #ea580c)",
                      boxShadow: "0 4px 14px rgba(245,158,11,0.35)"
                    }}
                  >
                    <Sparkles size={18} className="text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>
                      {t("masterBlasterTitle")}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed" style={{ color: "var(--text-dim)" }}>
                      {isPlatformAdmin ? t("masterBlasterAdminHint") : t("masterBlasterHint")}
                    </p>
                    {!isPlatformAdmin ? (
                      <Link
                        href="/billing/addons"
                        className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                        style={{ background: "linear-gradient(135deg, #f59e0b, #ea580c)" }}
                        onClick={onClose}
                      >
                        <Crown size={12} />
                        {t("masterBlasterCta")}
                      </Link>
                    ) : (
                      <span
                        className="mt-2 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase"
                        style={{ background: "rgba(34,197,94,0.15)", color: "#16a34a" }}
                      >
                        {t("masterBlasterAdminBadge")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {filtered.map((w) => (
                <WidgetLibraryCard
                  key={w.type}
                  widget={w}
                  category={category}
                  premiumBadge={category === "premium" ? getPremiumBadge(w) : null}
                  isFavorite={favorites.includes(w.type)}
                  dashboardData={dashboardData}
                  onToggleFavorite={() => toggleFavorite(w.type)}
                  onAdd={() => startAdd(w)}
                  onClose={onClose}
                />
              ))}
            </div>
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm" style={{ color: "var(--text-dim)" }}>
                {category === "favorites"
                  ? t("noFavoritesHint")
                  : category === "premium"
                    ? t("premiumEmpty")
                    : t("noWidgets")}
              </p>
            ) : null}
          </div>
        </div>

        <div
          className="ui-surface flex shrink-0 justify-end border-t px-5 py-3"
          style={{ borderColor: "var(--border-color)" }}
        >
          <button type="button" onClick={onClose} className="ui-btn-secondary">
            {t("close")}
          </button>
        </div>
          </>
        )}
      </div>
    </div>
  );
}

export function DashboardSwitcher({
  layouts,
  activeLayoutId,
  onSelect,
  onCreate,
  templates,
  maxDashboards
}: {
  layouts: Array<{ id: string; name: string; isDefault: boolean }>;
  activeLayoutId: string;
  onSelect: (id: string) => void;
  onCreate: (name: string, templateId?: string) => void;
  templates: Array<{ id: string; name: string }>;
  maxDashboards: number;
}) {
  const t = useTranslations("dashboardWidgets");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [templateId, setTemplateId] = useState("");

  const active = layouts.find((l) => l.id === activeLayoutId) ?? layouts[0];
  const atLimit = maxDashboards > 0 && layouts.length >= maxDashboards;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold"
        style={{ borderColor: "var(--border-color)", color: "var(--text-main)" }}
      >
        <LayoutGrid size={14} />
        {active?.name ?? t("defaultDashboard")}
        <ChevronDown size={14} />
      </button>

      {open ? (
        <div
          className="absolute left-0 top-full z-20 mt-1 min-w-[220px] rounded-xl border py-1 shadow-lg"
          style={{ background: "var(--surface-card)", borderColor: "var(--border-color)" }}
        >
          {layouts.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => {
                onSelect(l.id);
                setOpen(false);
              }}
              className="block w-full px-4 py-2 text-left text-sm hover:bg-[var(--surface-bg)]"
              style={{ color: l.id === activeLayoutId ? "#818cf8" : "var(--text-main)" }}
            >
              {l.name}
              {l.isDefault ? ` (${t("default")})` : ""}
            </button>
          ))}

          {!atLimit ? (
            creating ? (
              <div className="space-y-2 border-t px-3 py-2" style={{ borderColor: "var(--border-color)" }}>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t("newDashboardName")}
                  className="w-full rounded border px-2 py-1 text-xs"
                  style={{ borderColor: "var(--border-color)" }}
                />
                {templates.length ? (
                  <select
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                    className="w-full rounded border px-2 py-1 text-xs"
                    style={{ borderColor: "var(--border-color)" }}
                  >
                    <option value="">{t("blankDashboard")}</option>
                    {templates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.name}
                      </option>
                    ))}
                  </select>
                ) : null}
                <button
                  type="button"
                  className="text-xs font-semibold"
                  style={{ color: "#818cf8" }}
                  onClick={() => {
                    if (newName.trim()) {
                      onCreate(newName.trim(), templateId || undefined);
                      setNewName("");
                      setTemplateId("");
                      setCreating(false);
                      setOpen(false);
                    }
                  }}
                >
                  {t("createDashboard")}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="flex w-full items-center gap-2 border-t px-4 py-2 text-left text-sm"
                style={{ borderColor: "var(--border-color)", color: "#818cf8" }}
              >
                <Plus size={14} />
                {t("newDashboard")}
              </button>
            )
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function DashboardTvModeButton({ onToggle }: { onToggle: () => void }) {
  const t = useTranslations("dashboardWidgets");
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold"
      style={{ borderColor: "var(--border-color)", color: "var(--text-dim)" }}
      title={t("tvMode")}
    >
      <Tv size={14} />
      {t("tvMode")}
    </button>
  );
}
