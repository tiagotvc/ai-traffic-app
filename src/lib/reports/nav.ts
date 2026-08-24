export const REPORTS_NAV = {
  route: "/reports",
  navKey: "reports"
} as const;

// "schedule" volta ao menu — agendamento de envio existe de verdade (ReportSchedule +
// cron real), só ficou escondido enquanto não estava pronto pra expor. Hoje só envia por
// e-mail (via Resend): o seletor de canal em ReportsScheduleClient só aparece pra quem tem
// a flag reports.v3 (hoje admin_only) — pro resto dos tenants a criação já cai fixa em
// deliveryChannel "email_pdf", sem WhatsApp/link visível.
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
