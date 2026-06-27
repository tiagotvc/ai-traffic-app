"use client";

import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

import { FormSelect, type FormSelectOption } from "@/components/ui/FormSelect";
import { cn } from "@/lib/cn";
import {
  getPopoverFixedStyle,
  resolvePopoverPlacement
} from "@/lib/popover-position";

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  clearable?: boolean;
  "aria-label": string;
};

const DEFAULT_TIME = "09:00";

function parseDateTimeLocal(value: string): { date: string; time: string } | null {
  if (!value) return null;
  const match = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  if (!match) return null;
  return { date: match[1]!, time: match[2]! };
}

function toDateTimeLocal(date: string, time: string): string {
  return `${date}T${time}`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function todayLocalDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function dateFromParts(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function parseDateParts(date: string): { year: number; month: number; day: number } | null {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]) - 1,
    day: Number(match[3])
  };
}

const HOUR_OPTIONS: FormSelectOption[] = Array.from({ length: 24 }, (_, i) => {
  const value = pad(i);
  return { value, label: value };
});
const MINUTE_OPTIONS: FormSelectOption[] = Array.from({ length: 60 }, (_, i) => {
  const value = pad(i);
  return { value, label: value };
});

const CALENDAR_POPOVER_HEIGHT = 320;

function resolveCalendarPlacement(trigger: HTMLElement): "top" | "bottom" {
  return resolvePopoverPlacement(trigger, CALENDAR_POPOVER_HEIGHT, "bottom");
}

function getCalendarPopoverStyle(trigger: HTMLElement, placement: "top" | "bottom"): CSSProperties {
  return getPopoverFixedStyle(trigger, placement, {
    gap: 8,
    zIndex: 100
  });
}

type CalendarProps = {
  selectedDate: string | null;
  viewYear: number;
  viewMonth: number;
  locale: string;
  onSelect: (date: string) => void;
  onViewChange: (year: number, month: number) => void;
};

function CampaignCreatorDateCalendar({
  selectedDate,
  viewYear,
  viewMonth,
  locale,
  onSelect,
  onViewChange
}: CalendarProps) {
  const t = useTranslations("campaignCreator");

  const weekdayLabels = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
    const base = new Date(2024, 0, 7);
    return Array.from({ length: 7 }, (_, i) => formatter.format(new Date(base.getTime() + i * 86400000)));
  }, [locale]);

  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(viewYear, viewMonth, 1)),
    [locale, viewYear, viewMonth]
  );

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const today = todayLocalDate();

  function prevMonth() {
    if (viewMonth === 0) onViewChange(viewYear - 1, 11);
    else onViewChange(viewYear, viewMonth - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) onViewChange(viewYear + 1, 0);
    else onViewChange(viewYear, viewMonth + 1);
  }

  const cells: Array<{ day: number; date: string; outside: boolean } | null> = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      day,
      date: dateFromParts(viewYear, viewMonth, day),
      outside: false
    });
  }

  return (
    <div className="campaign-creator-datetime-calendar">
      <div className="campaign-creator-datetime-calendar__header">
        <button
          type="button"
          className="campaign-creator-datetime-calendar__nav"
          onClick={prevMonth}
          aria-label={t("scheduleCalendarPrev")}
        >
          <ChevronLeft size={16} />
        </button>
        <span className="campaign-creator-datetime-calendar__title">{monthLabel}</span>
        <button
          type="button"
          className="campaign-creator-datetime-calendar__nav"
          onClick={nextMonth}
          aria-label={t("scheduleCalendarNext")}
        >
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="campaign-creator-datetime-calendar__weekdays">
        {weekdayLabels.map((label) => (
          <span key={label} className="campaign-creator-datetime-calendar__weekday">
            {label}
          </span>
        ))}
      </div>
      <div className="campaign-creator-datetime-calendar__grid">
        {cells.map((cell, idx) =>
          cell ? (
            <button
              key={cell.date}
              type="button"
              className={cn(
                "campaign-creator-datetime-calendar__day",
                selectedDate === cell.date && "campaign-creator-datetime-calendar__day--selected",
                today === cell.date && selectedDate !== cell.date && "campaign-creator-datetime-calendar__day--today"
              )}
              onClick={() => onSelect(cell.date)}
            >
              {cell.day}
            </button>
          ) : (
            <span key={`empty-${idx}`} className="campaign-creator-datetime-calendar__day campaign-creator-datetime-calendar__day--empty" />
          )
        )}
      </div>
    </div>
  );
}

export function CampaignCreatorDateTimeField({
  value,
  onChange,
  disabled = false,
  className,
  clearable = false,
  "aria-label": ariaLabel
}: Props) {
  const locale = useLocale();
  const t = useTranslations("campaignCreator");
  const parsed = parseDateTimeLocal(value);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarPlacement, setCalendarPlacement] = useState<"top" | "bottom">("bottom");
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties>({});
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const initialParts = parsed
    ? parseDateParts(parsed.date)!
    : parseDateParts(todayLocalDate())!;
  const [viewYear, setViewYear] = useState(initialParts.year);
  const [viewMonth, setViewMonth] = useState(initialParts.month);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!calendarOpen || !triggerRef.current) return;

    function updatePopoverPosition() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const placement = resolveCalendarPlacement(trigger);
      setCalendarPlacement(placement);
      setPopoverStyle(getCalendarPopoverStyle(trigger, placement));
    }

    updatePopoverPosition();
    window.addEventListener("resize", updatePopoverPosition);
    window.addEventListener("scroll", updatePopoverPosition, true);
    return () => {
      window.removeEventListener("resize", updatePopoverPosition);
      window.removeEventListener("scroll", updatePopoverPosition, true);
    };
  }, [calendarOpen]);

  useEffect(() => {
    if (!calendarOpen) return;

    function onDoc(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setCalendarOpen(false);
    }

    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [calendarOpen]);

  const dateLabel = parsed
    ? new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" }).format(
        new Date(parsed.date + "T12:00:00")
      )
    : t("schedulePickDate");

  const time = parsed?.time ?? DEFAULT_TIME;
  const [hour, minute] = time.split(":");
  const timeDisabled = disabled || !parsed;

  function emit(date: string | null, nextTime: string) {
    if (!date) {
      onChange("");
      return;
    }
    onChange(toDateTimeLocal(date, nextTime));
  }

  function handleDateSelect(date: string) {
    emit(date, time);
    setCalendarOpen(false);
  }

  function handleTimeChange(part: "hour" | "minute", next: string) {
    if (!parsed?.date) return;
    const [hour, minute] = time.split(":");
    const nextTime = part === "hour" ? `${next}:${minute}` : `${hour}:${next}`;
    emit(parsed.date, nextTime);
  }

  function openCalendar() {
    if (disabled) return;
    const parts = parsed ? parseDateParts(parsed.date) : parseDateParts(todayLocalDate());
    if (parts) {
      setViewYear(parts.year);
      setViewMonth(parts.month);
    }
    setCalendarOpen(true);
  }

  const calendarPopover =
    calendarOpen && !disabled && mounted ? (
      <div
        ref={popoverRef}
        role="dialog"
        aria-modal="false"
        style={popoverStyle}
        data-placement={calendarPlacement}
        className="campaign-creator-datetime-calendar-popover campaign-creator-datetime-calendar-popover--portal"
      >
        <CampaignCreatorDateCalendar
          selectedDate={parsed?.date ?? null}
          viewYear={viewYear}
          viewMonth={viewMonth}
          locale={locale}
          onSelect={handleDateSelect}
          onViewChange={(year, month) => {
            setViewYear(year);
            setViewMonth(month);
          }}
        />
      </div>
    ) : null;

  return (
    <div ref={triggerRef} className={cn("relative w-full", className)}>
      <div
        className={cn(
          "campaign-creator-datetime-field flex w-full flex-col gap-2 rounded-lg border px-3 py-2 text-sm transition-all duration-200 focus-within:border-[var(--ui-accent)]",
          disabled && "cursor-not-allowed opacity-60"
        )}
        aria-label={ariaLabel}
      >
        <div className="flex min-w-0 items-center gap-2">
          <CalendarDays size={13} className="shrink-0 text-[var(--ui-accent)]" aria-hidden />
          <button
            type="button"
            disabled={disabled}
            onClick={openCalendar}
            className={cn(
              "min-w-0 flex-1 truncate text-left font-body text-sm outline-none",
              parsed ? "text-[var(--text-main)]" : "text-[var(--text-dimmer)]"
            )}
            aria-expanded={calendarOpen}
            aria-haspopup="dialog"
          >
            {dateLabel}
          </button>
          {clearable && parsed && !disabled ? (
            <button
              type="button"
              onClick={() => onChange("")}
              className="shrink-0 rounded p-0.5 text-[var(--text-dimmer)] transition-colors hover:text-[var(--text-main)]"
              aria-label={t("scheduleClearDate")}
            >
              <X size={14} />
            </button>
          ) : null}
        </div>
        <div className="flex items-center gap-2 border-t border-[var(--creator-card-border,var(--border-color))] pt-2">
          <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-[var(--text-dimmer)]">
            {t("scheduleTimeLabel")}
          </span>
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <FormSelect
              value={hour ?? "00"}
              onChange={(next) => handleTimeChange("hour", next)}
              options={HOUR_OPTIONS}
              placeholder={t("scheduleHour")}
              disabled={timeDisabled}
              clearable={false}
              className="campaign-creator-datetime-field__time-select min-w-0 flex-1"
              aria-label={`${ariaLabel} — ${t("scheduleHour")}`}
            />
            <span className="text-[var(--text-dimmer)]">:</span>
            <FormSelect
              value={minute ?? "00"}
              onChange={(next) => handleTimeChange("minute", next)}
              options={MINUTE_OPTIONS}
              placeholder={t("scheduleMinute")}
              disabled={timeDisabled}
              clearable={false}
              className="campaign-creator-datetime-field__time-select min-w-0 flex-1"
              aria-label={`${ariaLabel} — ${t("scheduleMinute")}`}
            />
          </div>
        </div>
      </div>
      {mounted && calendarPopover ? createPortal(calendarPopover, document.body) : null}
    </div>
  );
}
