"use client";

import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import {
  type AppliedCampaignFilter,
  type BudgetOp,
  type CampaignFilterField,
  audienceFilterSupported,
  filterId
} from "@/lib/campaign-meta-filters";
import { formatBRL } from "@/lib/format";

type MenuEntry =
  | { kind: "item"; field: CampaignFilterField; hasSubmenu?: boolean }
  | { kind: "divider" }
  | { kind: "toggle_more" };

const ROOT_MENU: MenuEntry[] = [
  { kind: "item", field: "name" },
  { kind: "item", field: "id" },
  { kind: "item", field: "objective" },
  { kind: "item", field: "delivery" },
  { kind: "divider" },
  { kind: "item", field: "budget_campaign_daily", hasSubmenu: true },
  { kind: "item", field: "audience_age", hasSubmenu: true },
  { kind: "toggle_more" }
];

const MORE_MENU: MenuEntry[] = [
  { kind: "item", field: "budget_campaign_lifetime" },
  { kind: "item", field: "budget_adset_daily" },
  { kind: "item", field: "budget_adset_lifetime" },
  { kind: "item", field: "audience_delivery_changes" },
  { kind: "item", field: "audience_gender" },
  { kind: "item", field: "audience_location" },
  { kind: "toggle_more" }
];

const BUDGET_SUBMENU: CampaignFilterField[] = [
  "budget_campaign_daily",
  "budget_campaign_lifetime",
  "budget_adset_daily",
  "budget_adset_lifetime"
];

const AUDIENCE_SUBMENU: CampaignFilterField[] = [
  "audience_age",
  "audience_delivery_changes",
  "audience_gender",
  "audience_location"
];

type Panel =
  | { type: "root"; showMore: boolean }
  | { type: "budget" }
  | { type: "audience" }
  | { type: "objective" }
  | { type: "delivery" }
  | { type: "budget_value"; field: CampaignFilterField };

export function MetaFilterSearchBar({
  value,
  onChange,
  filters,
  onFiltersChange,
  className = "",
  variant = "default"
}: {
  value: string;
  onChange: (v: string) => void;
  filters: AppliedCampaignFilter[];
  onFiltersChange: (next: AppliedCampaignFilter[]) => void;
  className?: string;
  variant?: "default" | "filterPill";
}) {
  const t = useTranslations("campaignFilters");
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>({ type: "root", showMore: false });
  const [budgetOp, setBudgetOp] = useState<BudgetOp>("gte");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [pendingField, setPendingField] = useState<CampaignFilterField | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setPanel({ type: "root", showMore: false });
    setPendingField(null);
    setBudgetAmount("");
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) close();
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, close]);

  function labelForField(field: CampaignFilterField): string {
    return t(field);
  }

  function removeFilter(id: string) {
    onFiltersChange(filters.filter((f) => filterId(f) !== id));
  }

  function addFilter(f: AppliedCampaignFilter) {
    const id = filterId(f);
    onFiltersChange([...filters.filter((x) => filterId(x) !== id), f]);
    close();
  }

  function chipLabel(f: AppliedCampaignFilter): string {
    if (f.field === "name" || f.field === "id") return `${t(f.field)}: ${f.value}`;
    if (f.field === "objective" || f.field === "delivery") {
      return `${t(f.field)}: ${t(`${f.field}_${f.value}`)}`;
    }
    if (
      f.field === "budget_campaign_daily" ||
      f.field === "budget_campaign_lifetime" ||
      f.field === "budget_adset_daily" ||
      f.field === "budget_adset_lifetime"
    ) {
      const op = f.op === "gte" ? t("opGte") : f.op === "lte" ? t("opLte") : t("opEq");
      return `${t(f.field)} ${op} ${formatBRL(f.amount)}`;
    }
    return t(f.field);
  }

  function onPickField(field: CampaignFilterField, hasSubmenu?: boolean) {
    if (audienceFilterSupported(field)) {
      if (hasSubmenu) {
        setPanel({ type: "audience" });
      }
      return;
    }
    if (field === "budget_campaign_daily" && hasSubmenu) {
      setPanel({ type: "budget" });
      return;
    }
    if (BUDGET_SUBMENU.includes(field)) {
      setPendingField(field);
      setPanel({ type: "budget_value", field });
      return;
    }
    if (field === "objective") {
      setPanel({ type: "objective" });
      return;
    }
    if (field === "delivery") {
      setPanel({ type: "delivery" });
      return;
    }
    if (field === "name" || field === "id") {
      const text = value.trim();
      if (text) addFilter({ field, value: text });
      else {
        setPendingField(field);
        close();
      }
    }
  }

  function applyBudget() {
    if (panel.type !== "budget_value") return;
    const amount = Number(budgetAmount.replace(",", "."));
    if (!Number.isFinite(amount) || amount < 0) return;
    const field = panel.field;
    if (
      field === "budget_campaign_daily" ||
      field === "budget_campaign_lifetime" ||
      field === "budget_adset_daily" ||
      field === "budget_adset_lifetime"
    ) {
      addFilter({ field, op: budgetOp, amount });
    }
  }

  const menuItems: MenuEntry[] =
    panel.type === "root"
      ? panel.showMore
        ? [...ROOT_MENU.filter((e) => e.kind !== "toggle_more"), ...MORE_MENU]
        : ROOT_MENU
      : [];

  const isFilterPill = variant === "filterPill";
  const pillBorder = open ? "var(--ui-accent)" : "var(--border-color)";

  return (
    <div
      ref={rootRef}
      className={`relative ${isFilterPill ? "min-w-[280px] flex-[2]" : "min-w-[200px] flex-1"} ${className}`}
    >
      <div
        className={
          isFilterPill
            ? "flex min-h-[38px] flex-wrap items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-all duration-200 focus-within:border-[var(--ui-accent)]"
            : "flex flex-wrap items-center gap-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-card)] px-2 py-1.5 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100"
        }
        style={
          isFilterPill
            ? {
                color: "var(--text-main)",
                background: "var(--filter-btn-bg)",
                borderColor: pillBorder
              }
            : undefined
        }
      >
        {isFilterPill ? (
          <Search size={14} className="shrink-0" style={{ color: "var(--ui-accent)" }} />
        ) : null}
        {filters.map((f) => (
          <span
            key={filterId(f)}
            className="inline-flex items-center gap-1 rounded-full bg-[rgba(124,58,237,0.1)] px-2 py-0.5 text-xs font-medium text-[var(--violet)]"
          >
            {chipLabel(f)}
            <button
              type="button"
              onClick={() => removeFilter(filterId(f))}
              className="text-violet-500 hover:text-[var(--violet)]"
              aria-label={t("removeFilter")}
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (pendingField === "name" || pendingField === "id") {
              const v = e.target.value.trim();
              if (v) {
                addFilter({ field: pendingField, value: v });
                setPendingField(null);
              }
            }
          }}
          onFocus={() => setOpen(true)}
          placeholder={
            pendingField === "name" || pendingField === "id"
              ? t("placeholderField", { field: t(pendingField) })
              : t("placeholder")
          }
          className="min-w-[80px] flex-1 border-0 bg-transparent px-0 py-0 text-sm font-body outline-none"
          aria-expanded={open}
          aria-controls={listId}
        />
      </div>

      {open ? (
        <div
          id={listId}
          className={`absolute left-0 right-0 top-full z-50 max-h-80 overflow-y-auto rounded-lg border py-1 shadow-2xl ${
            isFilterPill ? "mt-2" : "mt-1 rounded-xl"
          }`}
          style={{
            background: "var(--dropdown-bg, var(--surface-card))",
            borderColor: "var(--border-color)"
          }}
        >
          {panel.type === "root" ? (
            <>
              {menuItems.map((entry, i) => {
                if (entry.kind === "divider") {
                  return <div key={`d-${i}`} className="my-1 border-t border-[var(--border-color)]" />;
                }
                if (entry.kind === "toggle_more") {
                  const showMore = panel.showMore;
                  return (
                    <button
                      key="toggle"
                      type="button"
                      className="flex w-full items-center px-3 py-2 text-left text-sm font-body transition-colors"
                      style={{ color: "var(--text-dim)" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--row-hover, var(--surface-bg))";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "";
                      }}
                      onClick={() => setPanel({ type: "root", showMore: !showMore })}
                    >
                      {showMore ? t("seeLess") : t("seeMore")}
                      <span className="ml-auto text-[var(--text-dimmer)]">{showMore ? "▲" : "▼"}</span>
                    </button>
                  );
                }
                const disabled = audienceFilterSupported(entry.field) && !entry.hasSubmenu;
                return (
                  <button
                    key={entry.field}
                    type="button"
                    disabled={disabled}
                    className="flex w-full items-center px-3 py-2 text-left text-sm font-body transition-colors disabled:cursor-not-allowed disabled:text-[var(--text-dimmer)]"
                    style={{ color: disabled ? "var(--text-dimmer)" : "var(--text-dim)" }}
                    onMouseEnter={(e) => {
                      if (!disabled) e.currentTarget.style.background = "var(--row-hover, var(--surface-bg))";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "";
                    }}
                    onClick={() => onPickField(entry.field, entry.hasSubmenu)}
                  >
                    {labelForField(entry.field)}
                    {entry.hasSubmenu ? <span className="ml-auto text-[var(--text-dimmer)]">›</span> : null}
                  </button>
                );
              })}
            </>
          ) : null}

          {panel.type === "budget" ? (
            <>
              <button
                type="button"
                className="flex w-full items-center gap-2 border-b border-[var(--border-color)] px-3 py-2 text-left text-sm font-medium text-[var(--text-dim)] hover:bg-[var(--surface-bg)]"
                onClick={() => setPanel({ type: "root", showMore: false })}
              >
                ‹ {t("budget_menu")}
              </button>
              {BUDGET_SUBMENU.map((field) => (
                <button
                  key={field}
                  type="button"
                  className="flex w-full px-3 py-2 text-left text-sm text-[var(--text-dim)] hover:bg-[var(--surface-bg)]"
                  onClick={() => {
                    setPendingField(field);
                    setPanel({ type: "budget_value", field });
                  }}
                >
                  {labelForField(field)}
                </button>
              ))}
            </>
          ) : null}

          {panel.type === "audience" ? (
            <>
              <button
                type="button"
                className="flex w-full items-center gap-2 border-b border-[var(--border-color)] px-3 py-2 text-left text-sm font-medium text-[var(--text-dim)] hover:bg-[var(--surface-bg)]"
                onClick={() => setPanel({ type: "root", showMore: false })}
              >
                ‹ {t("audience_menu")}
              </button>
              {AUDIENCE_SUBMENU.map((field) => (
                <button
                  key={field}
                  type="button"
                  disabled
                  title={t("audienceUnavailable")}
                  className="flex w-full px-3 py-2 text-left text-sm text-[var(--text-dimmer)]"
                >
                  {labelForField(field)}
                </button>
              ))}
              <p className="px-3 py-2 text-[11px] text-[var(--text-dimmer)]">{t("audienceUnavailable")}</p>
            </>
          ) : null}

          {panel.type === "objective" ? (
            <>
              <button
                type="button"
                className="flex w-full items-center gap-2 border-b border-[var(--border-color)] px-3 py-2 text-left text-sm font-medium text-[var(--text-dim)] hover:bg-[var(--surface-bg)]"
                onClick={() => setPanel({ type: "root", showMore: false })}
              >
                ‹ {t("objective")}
              </button>
              {(["leads", "sales", "traffic", "awareness", "other"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  className="flex w-full px-3 py-2 text-left text-sm text-[var(--text-dim)] hover:bg-[var(--surface-bg)]"
                  onClick={() => addFilter({ field: "objective", value: v })}
                >
                  {t(`objective_${v}`)}
                </button>
              ))}
            </>
          ) : null}

          {panel.type === "delivery" ? (
            <>
              <button
                type="button"
                className="flex w-full items-center gap-2 border-b border-[var(--border-color)] px-3 py-2 text-left text-sm font-medium text-[var(--text-dim)] hover:bg-[var(--surface-bg)]"
                onClick={() => setPanel({ type: "root", showMore: false })}
              >
                ‹ {t("delivery")}
              </button>
              {(["ACTIVE", "PAUSED"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  className="flex w-full px-3 py-2 text-left text-sm text-[var(--text-dim)] hover:bg-[var(--surface-bg)]"
                  onClick={() => addFilter({ field: "delivery", value: v })}
                >
                  {t(`delivery_${v}`)}
                </button>
              ))}
            </>
          ) : null}

          {panel.type === "budget_value" ? (
            <div className="p-3">
              <button
                type="button"
                className="mb-2 flex items-center gap-1 text-xs font-medium text-[var(--text-dim)] hover:text-[var(--violet-bright)]"
                onClick={() =>
                  setPanel(
                    BUDGET_SUBMENU.includes(panel.field)
                      ? { type: "budget" }
                      : { type: "root", showMore: false }
                  )
                }
              >
                ‹ {labelForField(panel.field)}
              </button>
              <select
                value={budgetOp}
                onChange={(e) => setBudgetOp(e.target.value as BudgetOp)}
                className="ui-select mb-2 w-full text-sm"
              >
                <option value="gte">{t("opGte")}</option>
                <option value="lte">{t("opLte")}</option>
                <option value="eq">{t("opEq")}</option>
              </select>
              <input
                type="number"
                min={0}
                step="0.01"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                placeholder="R$"
                className="ui-input mb-2 w-full text-sm"
              />
              <button type="button" onClick={applyBudget} className="ui-btn-primary w-full text-sm">
                {t("apply")}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
