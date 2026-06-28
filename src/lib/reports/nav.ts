export const REPORTS_NAV = {
  route: "/reports",
  navKey: "reports"
} as const;

export const REPORTS_NAV_ITEMS = [
  { id: "build", href: "/reports", navKey: "reportsNavBuild" },
  { id: "schedule", href: "/reports/schedule", navKey: "reportsNavSchedule" }
] as const;

export type ReportsNavItemId = (typeof REPORTS_NAV_ITEMS)[number]["id"];

export function isReportsActive(base: string): boolean {
  return base === "/reports" || base.startsWith("/reports/");
}

export function isReportsBuildActive(base: string): boolean {
  if (base === "/reports") return true;
  if (base === "/reports/build") return true;
  return base.startsWith("/reports/build/");
}

export function isReportsScheduleActive(base: string): boolean {
  return base === "/reports/schedule" || base.startsWith("/reports/schedule/");
}
