"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

export type DateRange = { since: string; until: string };

/** Datas canônicas em UTC (YYYY-MM-DD), consistentes com google-ads-range.ts. */
function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}
function shiftIso(iso: string, deltaDays: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}
function daysAgoIso(n: number): string {
  return shiftIso(isoToday(), -n);
}

/** Intervalo dos últimos N dias (since = hoje-N, until = hoje) — casa com `?days=N`. */
export function lastNDaysRange(n: number): DateRange {
  return { since: daysAgoIso(n), until: isoToday() };
}

const PRESETS = [7, 30, 90] as const;

function monthKeyOf(iso: string): string {
  return iso.slice(0, 7); // YYYY-MM
}
function firstOfMonthIso(monthKey: string): string {
  return `${monthKey}-01`;
}
function shiftMonth(monthKey: string, delta: number): string {
  const y = Number(monthKey.slice(0, 4));
  const m = Number(monthKey.slice(5, 7)) - 1 + delta;
  const d = new Date(Date.UTC(y, m, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Células do mês: nulls de preenchimento no início + os dias (ISO). Semana começa no domingo. */
function monthCells(monthKey: string): (string | null)[] {
  const first = new Date(`${firstOfMonthIso(monthKey)}T00:00:00Z`);
  const year = first.getUTCFullYear();
  const month = first.getUTCMonth();
  const startWeekday = first.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${monthKey}-${String(d).padStart(2, "0")}`);
  }
  return cells;
}

export function GoogleDateRangePicker({
  value,
  onChange,
  className = ""
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}) {
  const t = useTranslations("client");
  const locale = useLocale();

  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => monthKeyOf(value.until));
  // Seleção em andamento dentro do popover (aplicada só no "Aplicar" ou preset).
  const [draftStart, setDraftStart] = useState<string | null>(null);
  const [draftEnd, setDraftEnd] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Ao abrir, semeia o rascunho com o valor atual e posiciona o calendário no mês final.
  useEffect(() => {
    if (open) {
      setDraftStart(value.since);
      setDraftEnd(value.until);
      setViewMonth(monthKeyOf(value.until));
    }
  }, [open, value.since, value.until]);

  // Fecha ao clicar fora.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const dayFmt = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", timeZone: "UTC" }),
    [locale]
  );
  const monthFmt = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }),
    [locale]
  );
  const weekdays = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" });
    // 2023-01-01 caiu num domingo.
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(Date.UTC(2023, 0, 1 + i))));
  }, [locale]);

  const today = isoToday();
  const presetOf = (r: DateRange): number | null =>
    r.until === today ? (PRESETS.find((n) => daysAgoIso(n) === r.since) ?? null) : null;

  const activePreset = presetOf(value);
  const triggerLabel =
    activePreset !== null
      ? t("googleAdsDays", { days: activePreset })
      : `${dayFmt.format(new Date(`${value.since}T00:00:00Z`))} – ${dayFmt.format(
          new Date(`${value.until}T00:00:00Z`)
        )}`;

  function pickDay(iso: string) {
    if (!draftStart || (draftStart && draftEnd)) {
      setDraftStart(iso);
      setDraftEnd(null);
    } else if (iso < draftStart) {
      setDraftStart(iso);
    } else {
      setDraftEnd(iso);
    }
  }

  function applyPreset(n: number) {
    onChange(lastNDaysRange(n));
    setOpen(false);
  }

  function applyDraft() {
    if (!draftStart) return;
    const end = draftEnd ?? draftStart;
    onChange({ since: draftStart, until: end });
    setOpen(false);
  }

  const cells = monthCells(viewMonth);
  const inRange = (iso: string) => {
    if (draftStart && draftEnd) return iso >= draftStart && iso <= draftEnd;
    return iso === draftStart;
  };
  const isEndpoint = (iso: string) => iso === draftStart || iso === draftEnd;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-xl ui-input text-xs"
      >
        <CalendarDays size={13} className="text-[var(--text-dim)]" />
        <span>{triggerLabel}</span>
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-1 w-[19rem] rounded-2xl border border-[var(--border-color)] bg-[var(--surface-card)] p-3 shadow-xl">
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => applyPreset(n)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                  activePreset === n
                    ? "border-transparent bg-[var(--ui-accent)] text-white"
                    : "border-[var(--border-color)] text-[var(--text-dim)]"
                }`}
              >
                {t("googleAdsDays", { days: n })}
              </button>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewMonth((m) => shiftMonth(m, -1))}
              className="rounded-lg p-1 text-[var(--text-dim)] hover:bg-[var(--surface-thead)]"
              aria-label="prev"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="text-xs font-semibold capitalize">
              {monthFmt.format(new Date(`${firstOfMonthIso(viewMonth)}T00:00:00Z`))}
            </div>
            <button
              type="button"
              onClick={() => setViewMonth((m) => shiftMonth(m, 1))}
              className="rounded-lg p-1 text-[var(--text-dim)] hover:bg-[var(--surface-thead)]"
              aria-label="next"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="mt-2 grid grid-cols-7 gap-0.5 text-center">
            {weekdays.map((w, i) => (
              <div key={i} className="py-1 text-[10px] font-medium uppercase text-[var(--text-dimmer)]">
                {w}
              </div>
            ))}
            {cells.map((iso, i) =>
              iso === null ? (
                <div key={`e${i}`} />
              ) : (
                <button
                  key={iso}
                  type="button"
                  disabled={iso > today}
                  onClick={() => pickDay(iso)}
                  className={`aspect-square rounded-lg text-[11px] transition disabled:opacity-30 ${
                    isEndpoint(iso)
                      ? "bg-[var(--ui-accent)] font-semibold text-white"
                      : inRange(iso)
                        ? "bg-[var(--ui-accent-muted)] text-[var(--text-main)]"
                        : "text-[var(--text-dim)] hover:bg-[var(--surface-thead)]"
                  }`}
                >
                  {Number(iso.slice(8, 10))}
                </button>
              )
            )}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="text-[11px] text-[var(--text-dimmer)]">
              {draftStart
                ? `${dayFmt.format(new Date(`${draftStart}T00:00:00Z`))}${
                    draftEnd ? ` – ${dayFmt.format(new Date(`${draftEnd}T00:00:00Z`))}` : ""
                  }`
                : ""}
            </div>
            <button
              type="button"
              onClick={applyDraft}
              disabled={!draftStart}
              className="ui-btn-secondary px-3 py-1.5 text-xs disabled:opacity-50"
            >
              {t("googleRangeApply")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
