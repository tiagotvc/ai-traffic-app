"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import {
  formatPeriodLabel,
  rollingDaysEndingYesterday,
  type ParsedPeriod,
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

export function PeriodFilter({
  value,
  onChange
}: {
  value: PeriodState;
  onChange: (next: PeriodState) => void;
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

  const parsed: ParsedPeriod = {
    preset: value.preset,
    since: value.preset === "custom" ? customSince : null,
    until: value.preset === "custom" ? customUntil : null,
    days:
      value.preset === "last7"
        ? 7
        : value.preset === "last14"
          ? 14
          : value.preset === "last15"
            ? 15
            : value.preset === "last30"
              ? 30
              : value.preset === "today" || value.preset === "yesterday"
                ? 1
                : null,
    allTime: value.preset === "all"
  };

  const label = formatPeriodLabel(parsed, locale, {
    today: t("today"),
    yesterday: t("yesterday"),
    last7: t("last7"),
    last14: t("last14"),
    last15: t("last15"),
    last30: t("last30"),
    custom: t("custom"),
    all: t("all")
  });

  function pick(preset: PeriodPreset) {
    if (preset === "custom") {
      onChange({ preset, since: customSince, until: customUntil });
    } else {
      onChange({ preset, since: "", until: "" });
    }
    if (preset !== "custom") setOpen(false);
  }

  function applyCustom() {
    onChange({ preset: "custom", since: customSince, until: customUntil });
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm hover:bg-slate-50"
        aria-expanded={open}
      >
        <span className="text-slate-400">📅</span>
        <span>{label}</span>
        <span className="text-slate-400">▾</span>
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-30 mt-1 min-w-[240px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {(
            [
              ["today", t("today")],
              ["yesterday", t("yesterday")],
              ["last7", t("last7")],
              ["last15", t("last15")],
              ["last30", t("last30")],
              ["all", t("all")]
            ] as const
          ).map(([preset, text]) => (
            <button
              key={preset}
              type="button"
              onClick={() => pick(preset)}
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                value.preset === preset ? "font-semibold text-violet-700" : "text-slate-700"
              }`}
            >
              {text}
            </button>
          ))}
          <div className="border-t border-slate-100 px-3 py-2">
            <div className="text-xs font-medium text-slate-500">{t("custom")}</div>
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
              <button
                type="button"
                onClick={applyCustom}
                className="rounded-lg bg-violet-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-violet-700"
              >
                {t("apply")}
              </button>
            </div>
          </div>
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
