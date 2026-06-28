"use client";

import { Calendar, ChevronDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { useDismissOnOutsideClick } from "@/hooks/useDismissOnOutsideClick";
import {
  formatPeriodLabel,
  periodStateToParsed,
  rollingDaysEndingYesterday,
  type PeriodPreset,
  periodToSearchParams
} from "@/lib/report-period";

export type PeriodState = {
  preset: PeriodPreset;
  since: string;
  until: string;
};

function defaultCustomRange() {
  return rollingDaysEndingYesterday(7);
}

const STRIP_PRESETS = [
  "today",
  "yesterday",
  "last7",
  "thisWeek",
  "last14",
  "last30",
  "thisMonth",
  "thisQuarter"
] as const;

export function PeriodFilter({
  value,
  onChange,
  variant = "default",
  disabled = false,
  disabledHint,
  className,
  creatorField = false
}: {
  value: PeriodState;
  onChange: (next: PeriodState) => void;
  variant?: "default" | "commandStrip" | "modal";
  disabled?: boolean;
  disabledHint?: string;
  className?: string;
  /** Match campaign creator inset fields (FilterSelectDropdown). */
  creatorField?: boolean;
}) {
  const t = useTranslations("period");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [customDraftOpen, setCustomDraftOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [customSince, setCustomSince] = useState(value.since || defaultCustomRange().since);
  const [customUntil, setCustomUntil] = useState(value.until || defaultCustomRange().until);

  useDismissOnOutsideClick(ref, open, () => setOpen(false));

  useEffect(() => {
    if (value.preset === "custom") {
      if (value.since) setCustomSince(value.since);
      if (value.until) setCustomUntil(value.until);
    }
  }, [value.preset, value.since, value.until]);

  const periodLabels = {
    today: t("today"),
    yesterday: t("yesterday"),
    thisWeek: t("thisWeek"),
    thisMonth: t("thisMonth"),
    thisQuarter: t("thisQuarter"),
    last7: t("last7"),
    last14: t("last14"),
    last15: t("last15"),
    last30: t("last30"),
    custom: t("custom"),
    all: t("all")
  };

  const label = formatPeriodLabel(periodStateToParsed(value), locale, periodLabels);

  function pick(preset: PeriodPreset) {
    if (preset === "custom") {
      if (value.preset === "custom") {
        if (value.since) setCustomSince(value.since);
        if (value.until) setCustomUntil(value.until);
      }
      setCustomDraftOpen(true);
      return;
    }
    setCustomDraftOpen(false);
    onChange({ preset, since: "", until: "" });
    setOpen(false);
  }

  function applyCustom() {
    onChange({ preset: "custom", since: customSince, until: customUntil });
    setCustomDraftOpen(false);
    setOpen(false);
  }

  const isStrip = variant === "commandStrip";
  const isModal = variant === "modal";
  const useStripTrigger = isStrip || variant === "default";
  const showCustomPanel = isModal
    ? customDraftOpen || value.preset === "custom"
    : !isStrip || customDraftOpen || value.preset === "custom";

  const stripPresetLabels: Record<(typeof STRIP_PRESETS)[number], string> = {
    today: periodLabels.today,
    yesterday: periodLabels.yesterday,
    last7: periodLabels.last7,
    thisWeek: periodLabels.thisWeek,
    last14: periodLabels.last14,
    last30: periodLabels.last30,
    thisMonth: periodLabels.thisMonth,
    thisQuarter: periodLabels.thisQuarter
  };

  function renderPresetButton(preset: PeriodPreset, text: string) {
    const selected =
      preset === "custom" ? value.preset === "custom" || customDraftOpen : value.preset === preset;
    return (
      <button
        key={preset}
        type="button"
        onClick={() => pick(preset)}
        className="block w-full px-3 py-2 text-left font-body text-sm transition-colors"
        style={{
          color: selected ? "var(--ui-accent)" : "var(--text-dim)",
          fontWeight: selected ? 600 : undefined
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--row-hover, var(--surface-bg))";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "";
        }}
      >
        {text}
      </button>
    );
  }

  if (isModal) {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {STRIP_PRESETS.map((preset) => {
            const selected = value.preset === preset;
            return (
              <button
                key={preset}
                type="button"
                disabled={disabled}
                onClick={() => pick(preset)}
                className={cn(
                  "rounded-lg border px-2 py-2 text-left text-xs font-medium transition-colors",
                  disabled && "cursor-not-allowed opacity-45"
                )}
                style={{
                  borderColor: selected ? "var(--ui-accent)" : "var(--border-color)",
                  background: selected ? "var(--ui-accent-muted)" : "var(--filter-btn-bg)",
                  color: selected ? "var(--ui-accent)" : "var(--text-dim)"
                }}
              >
                {stripPresetLabels[preset]}
              </button>
            );
          })}
          <button
            type="button"
            disabled={disabled}
            onClick={() => pick("custom")}
            className={cn(
              "rounded-lg border px-2 py-2 text-left text-xs font-medium transition-colors",
              disabled && "cursor-not-allowed opacity-45"
            )}
            style={{
              borderColor:
                value.preset === "custom" || customDraftOpen ? "var(--ui-accent)" : "var(--border-color)",
              background:
                value.preset === "custom" || customDraftOpen ? "var(--ui-accent-muted)" : "var(--filter-btn-bg)",
              color: value.preset === "custom" || customDraftOpen ? "var(--ui-accent)" : "var(--text-dim)"
            }}
          >
            {periodLabels.custom}
          </button>
        </div>
        {disabled && disabledHint ? (
          <p className="text-xs text-[var(--text-dim)]">{disabledHint}</p>
        ) : null}
        {showCustomPanel ? (
          <div className="rounded-lg border border-[var(--border-color)] px-3 py-2">
            <div className="text-xs font-medium text-[var(--text-dim)]">{periodLabels.custom}</div>
            <div className="mt-2 flex flex-col gap-2">
              <input
                type="date"
                value={customSince}
                onChange={(e) => setCustomSince(e.target.value)}
                className="ui-input text-xs"
                disabled={disabled}
              />
              <input
                type="date"
                value={customUntil}
                onChange={(e) => setCustomUntil(e.target.value)}
                className="ui-input text-xs"
                disabled={disabled}
              />
              <button type="button" onClick={applyCustom} disabled={disabled} className="ui-btn-primary text-xs">
                {t("apply")}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div ref={ref} className={cn("relative", className ?? "w-full")}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        title={disabled ? disabledHint : undefined}
        className={cn(
          "flex items-center gap-2 whitespace-nowrap rounded-lg border px-3 text-sm transition-all duration-200",
          creatorField
            ? "h-9 min-h-9 flex-nowrap items-center py-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] border-[var(--creator-card-border,var(--border-color))] bg-[var(--creator-card-bg-inset,var(--surface-bg))]"
            : "py-2",
          creatorField && open && "border-[var(--ui-accent)]",
          className ? "w-auto min-w-[220px]" : "w-full",
          disabled && "cursor-not-allowed opacity-45"
        )}
        style={{
          color: "var(--text-main)",
          ...(!creatorField
            ? {
                background: "var(--filter-btn-bg)",
                borderColor: open ? "var(--ui-accent)" : "var(--border-color)"
              }
            : {})
        }}
        aria-expanded={open}
      >
        <Calendar size={14} style={{ color: "var(--ui-accent)" }} className="shrink-0" />
        <span className="mr-1 hidden font-body text-xs font-medium sm:inline" style={{ color: "var(--text-dim)" }}>
          {t("periodLabel")}:
        </span>
        <span className="max-w-[140px] truncate font-body text-sm">{label}</span>
        <ChevronDown
          size={14}
          className={cn("ml-auto shrink-0 transition-transform", open && "rotate-180")}
          style={{ color: "var(--text-dim)" }}
        />
      </button>
      {open ? (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-full min-w-[240px] overflow-hidden rounded-lg border py-1 shadow-2xl"
          style={{
            background: "var(--dropdown-bg, var(--surface-card))",
            borderColor: "var(--border-color)"
          }}
        >
          {isStrip ? (
            <>
              {STRIP_PRESETS.map((preset) =>
                renderPresetButton(preset, stripPresetLabels[preset])
              )}
              {renderPresetButton("custom", periodLabels.custom)}
            </>
          ) : (
            <>
              {(
                [
                  ["today", periodLabels.today],
                  ["yesterday", periodLabels.yesterday],
                  ["thisWeek", periodLabels.thisWeek],
                  ["last7", periodLabels.last7],
                  ["last15", periodLabels.last15],
                  ["last30", periodLabels.last30],
                  ["all", periodLabels.all]
                ] as const
              ).map(([preset, text]) => renderPresetButton(preset, text))}
            </>
          )}
          {showCustomPanel ? (
            <div className="border-t border-[var(--border-color)] px-3 py-2">
              <div className="text-xs font-medium text-[var(--text-dim)]">{periodLabels.custom}</div>
              <div className="mt-2 flex flex-col gap-2">
                <input
                  type="date"
                  value={customSince}
                  onChange={(e) => setCustomSince(e.target.value)}
                  className="ui-input text-xs"
                />
                <input
                  type="date"
                  value={customUntil}
                  onChange={(e) => setCustomUntil(e.target.value)}
                  className="ui-input text-xs"
                />
                <button type="button" onClick={applyCustom} className="ui-btn-primary text-xs">
                  {t("apply")}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function periodStateToQuery(state: PeriodState): URLSearchParams {
  return periodToSearchParams({
    preset: state.preset,
    since: state.since,
    until: state.until
  });
}
