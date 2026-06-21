"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, LayoutGrid, Plus, Star, Tv } from "lucide-react";

import { WIDGET_CATEGORY_ORDER } from "@/lib/dashboard/widget-catalog";

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
  }>;
  onClose: () => void;
  onAdd: (widgetType: string) => void;
}) {
  const t = useTranslations("dashboardWidgets");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("favorites");
  const [favorites, setFavorites] = useState<string[]>(() => loadFavorites());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.filter((w) => {
      const title = t(w.titleKey).toLowerCase();
      if (q && !title.includes(q) && !w.type.includes(q)) return false;
      if (category === "favorites") return favorites.includes(w.type);
      return w.category === category;
    });
  }, [catalog, query, category, favorites, t]);

  if (!open) return null;

  const toggleFavorite = (type: string) => {
    setFavorites((cur) => {
      const next = cur.includes(type) ? cur.filter((x) => x !== type) : [...cur, type];
      saveFavorites(next);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border shadow-xl"
        style={{ background: "var(--surface-card)", borderColor: "var(--border-color)" }}
      >
        <div className="border-b px-5 py-4" style={{ borderColor: "var(--border-color)" }}>
          <h2 className="font-heading text-lg font-semibold" style={{ color: "var(--text-main)" }}>
            {t("libraryTitle")}
          </h2>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("librarySearch")}
            className="mt-3 w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "var(--border-color)", background: "var(--surface-bg)", color: "var(--text-main)" }}
          />
        </div>

        <div className="flex min-h-0 flex-1">
          <nav
            className="hidden w-40 shrink-0 overflow-y-auto border-r p-2 sm:block"
            style={{ borderColor: "var(--border-color)" }}
          >
            {WIDGET_CATEGORY_ORDER.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className="mb-1 w-full rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors"
                style={{
                  background: category === cat ? "rgba(79,70,229,0.12)" : "transparent",
                  color: category === cat ? "#818cf8" : "var(--text-dim)"
                }}
              >
                {t(`category_${cat}`)}
              </button>
            ))}
          </nav>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {filtered.map((w) => (
                <div
                  key={w.type}
                  className="flex items-start gap-2 rounded-xl border p-3"
                  style={{
                    borderColor: "var(--border-color)",
                    opacity: w.allowed && !w.comingSoon ? 1 : 0.55
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>
                      {t(w.titleKey)}
                    </p>
                    <p className="text-[11px]" style={{ color: "var(--text-dim)" }}>
                      {w.comingSoon ? t("comingSoon") : w.allowed ? t("available") : t("upgradeRequired")}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <button type="button" onClick={() => toggleFavorite(w.type)} aria-label="Favorite">
                      <Star
                        size={14}
                        fill={favorites.includes(w.type) ? "#f59e0b" : "none"}
                        style={{ color: favorites.includes(w.type) ? "#f59e0b" : "var(--text-dimmer)" }}
                      />
                    </button>
                    <button
                      type="button"
                      disabled={!w.allowed || w.comingSoon}
                      onClick={() => {
                        onAdd(w.type);
                        onClose();
                      }}
                      className="rounded-md p-1 disabled:opacity-40"
                      style={{ background: "rgba(79,70,229,0.12)", color: "#818cf8" }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm" style={{ color: "var(--text-dim)" }}>
                {t("noWidgets")}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex justify-end border-t px-5 py-3" style={{ borderColor: "var(--border-color)" }}>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm font-medium"
            style={{ borderColor: "var(--border-color)", color: "var(--text-dim)" }}
          >
            {t("close")}
          </button>
        </div>
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
