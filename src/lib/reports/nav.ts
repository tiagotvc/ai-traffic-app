export const REPORTS_NAV = {
  route: "/reports",
  navKey: "reports"
} as const;

export function isReportsActive(base: string): boolean {
  return base === "/reports" || base.startsWith("/reports/");
}
