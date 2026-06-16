function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dayDiff(from: Date, to: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((startOfLocalDay(from).getTime() - startOfLocalDay(to).getTime()) / msPerDay);
}

function formatTime(date: Date, locale: string): string {
  return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

function formatShortDate(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, { dateStyle: "short" });
}

type RelativeLabels = {
  today: (time: string) => string;
  yesterday: (time: string) => string;
  dayBeforeYesterday: (time: string) => string;
};

function labelsForLocale(locale: string): RelativeLabels {
  const isPt = locale.toLowerCase().startsWith("pt");
  if (isPt) {
    return {
      today: (time) => `Hoje às ${time}`,
      yesterday: (time) => `Ontem às ${time}`,
      dayBeforeYesterday: (time) => `Anteontem às ${time}`
    };
  }
  return {
    today: (time) => `Today at ${time}`,
    yesterday: (time) => `Yesterday at ${time}`,
    dayBeforeYesterday: (time) => `Day before yesterday at ${time}`
  };
}

/** Relative created-at label: today/yesterday/day-before-yesterday with time, else short date. */
export function formatBrainCreatedAt(
  iso: string,
  locale: string,
  now: Date = new Date()
): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const diff = dayDiff(now, date);
  const labels = labelsForLocale(locale);

  if (diff === 0) return labels.today(formatTime(date, locale));
  if (diff === 1) return labels.yesterday(formatTime(date, locale));
  if (diff === 2) return labels.dayBeforeYesterday(formatTime(date, locale));
  return formatShortDate(date, locale);
}
