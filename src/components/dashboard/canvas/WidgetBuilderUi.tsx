"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { METRIC_BY_KEY, METRIC_CATALOG, METRIC_CATEGORIES, type MetricKey } from "@/lib/dashboard-metrics";

export function BuilderField({
  label,
  children,
  className
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="ui-label mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

export function BuilderSelect({
  value,
  onChange,
  options,
  className
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  className?: string;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={cn("ui-select", className)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function BuilderSegment({
  options,
  value,
  onChange
}: {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      className="inline-flex rounded-xl border p-0.5"
      style={{ borderColor: "var(--border-color)", background: "var(--filter-btn-bg)" }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
              active ? "shadow-sm" : "hover:text-[var(--text-main)]"
            )}
            style={
              active
                ? { background: "var(--surface-card)", color: "var(--violet-bright)" }
                : { color: "var(--text-dim)" }
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function BuilderMetricPicker({
  activeKeys,
  onToggle,
  max = 6,
  tMetrics
}: {
  activeKeys: MetricKey[];
  onToggle: (key: MetricKey) => void;
  max?: number;
  tMetrics: (key: MetricKey) => string;
}) {
  return (
    <div
      className="max-h-[108px] overflow-y-auto rounded-xl border p-2"
      style={{ borderColor: "var(--border-color)", background: "var(--surface-bg)" }}
    >
      <div className="space-y-2">
        {METRIC_CATEGORIES.map((cat) => (
          <div key={cat}>
            <p className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
              {cat}
            </p>
            <div className="flex flex-wrap gap-1">
              {METRIC_CATALOG.filter((m) => m.category === cat).map((m) => {
                const active = activeKeys.includes(m.key);
                const disabled = !active && activeKeys.length >= max;
                return (
                  <button
                    key={m.key}
                    type="button"
                    disabled={disabled}
                    onClick={() => onToggle(m.key)}
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[10px] font-medium transition-all disabled:opacity-30",
                      !active && "border"
                    )}
                    style={
                      active
                        ? {
                            background: `${m.color}18`,
                            color: m.color,
                            boxShadow: `0 0 0 1px ${m.color}44`
                          }
                        : {
                            borderColor: "var(--border-color)",
                            color: "var(--text-dim)"
                          }
                    }
                  >
                    {tMetrics(METRIC_BY_KEY[m.key]?.label ?? m.key)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BuilderPreviewFrame({
  title,
  hint,
  children,
  minHeight = 280
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  minHeight?: number;
}) {
  return (
    <div
      className="rounded-2xl border"
      style={{
        borderColor: "var(--border-color)",
        background: "linear-gradient(180deg, var(--surface-bg), var(--surface-card))"
      }}
    >
      <div
        className="flex items-center justify-between border-b px-4 py-2.5"
        style={{ borderColor: "var(--border-color)" }}
      >
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-dimmer)]">
            {title}
          </p>
          {hint ? <p className="mt-0.5 text-[11px] text-[var(--text-dim)]">{hint}</p> : null}
        </div>
      </div>
      <div className="overflow-visible p-3" style={{ minHeight }}>
        {children}
      </div>
    </div>
  );
}

export function BuilderSlotContext({
  title,
  children,
  tabs,
  activeTab,
  onTabChange
}: {
  title: string;
  children: ReactNode;
  tabs?: Array<{ id: string; label: string; premium?: boolean }>;
  activeTab?: string;
  onTabChange?: (id: string) => void;
}) {
  return (
    <div
      className="rounded-2xl border"
      style={{
        borderColor: "rgba(99,102,241,0.25)",
        background: "rgba(79,70,229,0.04)"
      }}
    >
      <div className="border-b px-4 py-3" style={{ borderColor: "rgba(99,102,241,0.15)" }}>
        <p className="text-xs font-semibold text-[var(--text-main)]">{title}</p>
        {tabs?.length ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {tabs.map((tab) => {
              const active = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange?.(tab.id)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-all",
                    active ? "shadow-sm" : "opacity-70 hover:opacity-100"
                  )}
                  style={
                    active
                      ? { background: "var(--surface-card)", color: "var(--violet-bright)" }
                      : { color: "var(--text-dim)" }
                  }
                >
                  {tab.label}
                  {tab.premium ? (
                    <span className="ml-1 text-[8px] text-amber-500">★</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export function BuilderColorInput({
  label,
  value,
  onChange,
  disabled
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className={cn("flex items-center gap-2", disabled && "opacity-45")}>
      <input
        type="color"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-8 cursor-pointer rounded-lg border bg-transparent p-0.5"
        style={{ borderColor: "var(--border-color)" }}
      />
      <span className="text-[11px] text-[var(--text-dim)]">{label}</span>
    </label>
  );
}

export function BuilderPremiumLock({
  children,
  locked,
  message
}: {
  children: ReactNode;
  locked: boolean;
  message: string;
}) {
  if (!locked) return <>{children}</>;
  return (
    <div className="relative">
      <div className="pointer-events-none select-none opacity-40 blur-[0.3px]">{children}</div>
      <div
        className="absolute inset-0 flex items-center justify-center rounded-xl px-3 text-center text-[10px] font-medium"
        style={{ background: "rgba(15,20,25,0.55)", color: "#fbbf24" }}
      >
        {message}
      </div>
    </div>
  );
}

export function BuilderChartStyleGrid({
  value,
  onChange,
  t,
  advancedUnlocked
}: {
  value: string;
  onChange: (v: string) => void;
  t: (key: string) => string;
  advancedUnlocked: boolean;
}) {
  const items = [
    { id: "area", label: t("configChartStyleArea"), premium: false },
    { id: "line", label: t("configChartStyleLine"), premium: false },
    { id: "bar", label: t("configChartStyleBar"), premium: false },
    { id: "pie", label: t("configChartStylePie"), premium: true },
    { id: "donut", label: t("configChartStyleDonut"), premium: true },
    { id: "radar", label: t("configChartStyleRadar"), premium: true }
  ];

  return (
    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
      {items.map((item) => {
        const active = value === item.id;
        const disabled = item.premium && !advancedUnlocked;
        return (
          <button
            key={item.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(item.id)}
            className={cn(
              "relative rounded-xl border px-2 py-2 text-[10px] font-medium transition-all disabled:cursor-not-allowed disabled:opacity-35",
              active && "ring-2 ring-indigo-400/50"
            )}
            style={{
              borderColor: active ? "rgba(99,102,241,0.5)" : "var(--border-color)",
              background: active ? "rgba(79,70,229,0.1)" : "var(--surface-bg)",
              color: active ? "var(--violet-bright)" : "var(--text-dim)"
            }}
          >
            {item.label}
            {item.premium ? (
              <span className="absolute right-1 top-0.5 text-[7px] text-amber-500">★</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
