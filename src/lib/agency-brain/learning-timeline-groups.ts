import type { LearningDto } from "@/lib/agency-brain/types";

export type TimelineGroup = {
  id: string;
  label: string;
  items: LearningDto[];
};

type TranslateFn = (key: string, values?: Record<string, string | number>) => string;

function startOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function monthLabel(date: Date, locale: string, t: TranslateFn): string {
  const month = date.toLocaleDateString(locale, { month: "long" });
  const capitalized = month.charAt(0).toUpperCase() + month.slice(1);
  const now = new Date();
  if (date.getFullYear() === now.getFullYear()) return capitalized;
  return t("timelineMonthYear", { month: capitalized, year: date.getFullYear() });
}

export function groupLearningsByTimeline(
  learnings: LearningDto[],
  t: TranslateFn,
  locale: string
): TimelineGroup[] {
  const todayStart = startOfDay(new Date());
  const yesterdayStart = todayStart - 86400000;
  const weekStart = todayStart - 7 * 86400000;

  const buckets = new Map<string, TimelineGroup>();

  function ensureBucket(id: string, label: string): TimelineGroup {
    let group = buckets.get(id);
    if (!group) {
      group = { id, label, items: [] };
      buckets.set(id, group);
    }
    return group;
  }

  for (const learning of learnings) {
    const created = new Date(learning.createdAt);
    const day = startOfDay(created);

    if (day >= todayStart) {
      ensureBucket("today", t("timelineToday")).items.push(learning);
    } else if (day >= yesterdayStart) {
      ensureBucket("yesterday", t("timelineYesterday")).items.push(learning);
    } else if (day >= weekStart) {
      ensureBucket("last_week", t("timelineLastWeek")).items.push(learning);
    } else {
      const monthId = `${created.getFullYear()}-${created.getMonth()}`;
      const label = monthLabel(created, locale, t);
      ensureBucket(`month-${monthId}`, label).items.push(learning);
    }
  }

  const order = ["today", "yesterday", "last_week"];
  const monthGroups = [...buckets.entries()]
    .filter(([id]) => id.startsWith("month-"))
    .sort(([a], [b]) => b.localeCompare(a));

  const result: TimelineGroup[] = [];
  for (const id of order) {
    const group = buckets.get(id);
    if (group && group.items.length > 0) result.push(group);
  }
  for (const [, group] of monthGroups) {
    if (group.items.length > 0) result.push(group);
  }

  return result;
}
