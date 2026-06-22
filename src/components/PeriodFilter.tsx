"use client";

import { Calendar, ChevronDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";
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

const STRIP_PRESETS = ["last7", "thisWeek", "last14", "last30", "thisMonth", "thisQuarter"] as const;

export function PeriodFilter({
  value,
  onChange,
  variant = "default"
}: {
  value: PeriodState;
  onChange: (next: PeriodState) => void;
  variant?: "default" | "commandStrip";
}) {
  const t = useTranslations("period");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [customSince, setCustomSince] = useState(value.since || defaultCustomRange().since);
  const [customUntil, setCustomUntil] = useState(value.until || defaultCustomRange().until);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

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
      onChange({ preset, since: customSince, until: customUntil });
      return;
    }
    onChange({ preset, since: "", until: "" });
    setOpen(false);
  }

  function applyCustom() {
    onChange({ preset: "custom", since: customSince, until: customUntil });
    setOpen(false);
  }

  const isStrip = variant === "commandStrip";
  const showCustomPanel = !isStrip || value.preset === "custom";

  const stripPresetLabels: Record<(typeof STRIP_PRESETS)[number], string> = {
    last7: periodLabels.last7,
    thisWeek: periodLabels.thisWeek,
    last14: periodLabels.last14,
    last30: periodLabels.last30,
    thisMonth: periodLabels.thisMonth,
    thisQuarter: periodLabels.thisQuarter
  };

  function renderPresetButton(preset: PeriodPreset, text: string, selectedStyle: "amber" | "violet") {
    const selected = value.preset === preset;
    return (
      <button
        key={preset}
        type="button"
        onClick={() => pick(preset)}
        className="block w-full px-3 py-2 text-left font-body text-sm transition-colors"
        style={{
          color:
            selectedStyle === "amber"
              ? selected
                ? "var(--amber-bright)"
                : "var(--text-dim)"
              : selected
                ? "var(--violet)"
                : "var(--text-dim)",
          fontWeight: selected && selectedStyle === "violet" ? 600 : undefined
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

  return (
    <div ref={ref} className={isStrip ? "relative inline-block" : "relative"}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={
          isStrip
            ? "flex w-full items-center gap-2 whitespace-nowrap rounded-lg border px-3 py-2 text-sm transition-all duration-200"
            : "flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-card)] px-3 py-2 text-sm text-[var(--text-dim)] shadow-sm hover:bg-[var(--surface-bg)]"
        }
        style={
          isStrip
            ? {
                color: "var(--text-main)",
                background: "var(--filter-btn-bg)",
                borderColor: open ? "var(--amber-bright)" : "var(--border-color)"
              }
            : undefined
        }
        aria-expanded={open}
      >
        {isStrip ? (
          <>
            <Calendar size={14} style={{ color: "var(--text-dim)" }} className="shrink-0" />
            <span className="mr-1 hidden font-body text-xs font-medium sm:inline" style={{ color: "var(--text-dim)" }}>
              {t("periodLabel")}:
            </span>
            <span className="max-w-[140px] truncate font-body text-sm">{label}</span>
            <ChevronDown
              size={14}
              className={cn("ml-auto shrink-0 transition-transform", open && "rotate-180")}
              style={{ color: "var(--text-dim)" }}
            />
          </>
        ) : (
          <>
            <span className="text-[var(--text-dimmer)]">📅</span>
            <span>{label}</span>
            <span className="text-[var(--text-dimmer)]">{open ? "▴" : "▾"}</span>
          </>
        )}
      </button>
      {open ? (
        <div
          className={
            isStrip
              ? "absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-lg border py-1 shadow-2xl"
              : "absolute left-0 top-full z-30 mt-1 min-w-[240px] rounded-xl border border-[var(--border-color)] bg-[var(--surface-card)] py-1 shadow-lg"
          }
          style={
            isStrip
              ? {
                  background: "var(--dropdown-bg, var(--surface-card))",
                  borderColor: "var(--border-color)"
                }
              : undefined
          }
        >
          {isStrip ? (
            <>
              {STRIP_PRESETS.map((preset) =>
                renderPresetButton(preset, stripPresetLabels[preset], "amber")
              )}
              {renderPresetButton("custom", periodLabels.custom, "amber")}
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
              ).map(([preset, text]) => renderPresetButton(preset, text, "violet"))}
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
