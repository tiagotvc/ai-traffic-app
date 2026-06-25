"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, LayoutGrid, Plus, Tv } from "lucide-react";

import { cn } from "@/lib/cn";
import { useDismissOnOutsideClick } from "@/hooks/useDismissOnOutsideClick";

export function DashboardSwitcher({
  layouts,
  activeLayoutId,
  onSelect,
  onCreate,
  templates,
  maxDashboards,
  allowCustomization = true,
  variant = "title"
}: {
  layouts: Array<{ id: string; name: string; isDefault: boolean }>;
  activeLayoutId: string;
  onSelect: (id: string) => void;
  onCreate: (name: string, templateId?: string) => void;
  templates: Array<{ id: string; name: string }>;
  maxDashboards: number;
  allowCustomization?: boolean;
  variant?: "title" | "compact";
}) {
  const t = useTranslations("dashboardWidgets");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const active = layouts.find((l) => l.id === activeLayoutId) ?? layouts[0];
  const atLimit = maxDashboards > 0 && layouts.length >= maxDashboards;
  const displayName = active?.name ?? t("defaultDashboard");

  useDismissOnOutsideClick(rootRef, open, () => {
    setOpen(false);
    setCreating(false);
  });

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "flex min-w-0 items-center gap-1.5 rounded-lg transition",
          variant === "title"
            ? "-ml-1 px-1 py-0.5 hover:bg-[var(--surface-bg)]"
            : "h-9 shrink-0 border px-2.5 text-[11px] font-semibold shadow-sm hover:shadow-md"
        )}
        style={
          variant === "compact"
            ? {
                borderColor: open ? "rgba(129,140,248,0.45)" : "var(--border-color)",
                background: open ? "rgba(129,140,248,0.08)" : "var(--surface-card)",
                color: "var(--text-main)",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
              }
            : undefined
        }
      >
        {variant === "compact" ? (
          <LayoutGrid size={14} className="shrink-0" style={{ color: "var(--text-dim)" }} />
        ) : null}
        <span
          className={cn(
            "truncate font-heading font-bold",
            variant === "title" ? "text-left text-xl sm:text-2xl" : "max-w-[72px] text-[11px]"
          )}
          style={{ color: "var(--text-main)" }}
        >
          {displayName}
        </span>
        <ChevronDown
          size={variant === "title" ? 18 : 12}
          className={cn("shrink-0 transition-transform", open && "rotate-180")}
          style={{ color: "var(--text-dim)" }}
        />
      </button>

      {open ? (
        <div
          className={cn(
            "absolute top-full z-30 mt-1 min-w-[220px] rounded-xl border py-1 shadow-lg",
            variant === "title" ? "left-0" : "right-0"
          )}
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

          {allowCustomization && !atLimit ? (
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
      className="flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-semibold shadow-sm transition hover:shadow-md"
      style={{
        borderColor: "var(--border-color)",
        background: "var(--surface-card)",
        color: "var(--text-dim)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
      }}
      title={t("tvMode")}
      aria-label={t("tvMode")}
    >
      <Tv size={14} />
      <span>{t("tvMode")}</span>
    </button>
  );
}
