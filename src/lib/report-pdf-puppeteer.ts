import "server-only";

import type { MetricKey } from "@/lib/dashboard-metrics";
import type { PeriodPreset } from "@/lib/report-period";
import { createReportPrintToken } from "@/lib/report-print-token";

export const REPORT_PRINT_WIDTH_PX = 794;

function appBaseUrl(): string {
  const explicit = process.env.REPORT_PRINT_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  const authUrl = process.env.NEXTAUTH_URL?.trim();
  if (authUrl) return authUrl.replace(/\/$/, "");
  return "http://127.0.0.1:3008";
}

async function launchBrowser() {
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

  if (isServerless) {
    const chromium = await import("@sparticuz/chromium");
    const puppeteer = await import("puppeteer-core");
    return puppeteer.default.launch({
      args: chromium.default.args,
      defaultViewport: { width: REPORT_PRINT_WIDTH_PX, height: 1123, deviceScaleFactor: 1 },
      executablePath: await chromium.default.executablePath(),
      headless: true
    });
  }

  try {
    const puppeteer = await import("puppeteer");
    return puppeteer.default.launch({
      headless: true,
      defaultViewport: { width: REPORT_PRINT_WIDTH_PX, height: 1123, deviceScaleFactor: 1 }
    });
  } catch {
    const chromium = await import("@sparticuz/chromium");
    const puppeteer = await import("puppeteer-core");
    return puppeteer.default.launch({
      args: chromium.default.args,
      defaultViewport: { width: REPORT_PRINT_WIDTH_PX, height: 1123, deviceScaleFactor: 1 },
      executablePath: await chromium.default.executablePath(),
      headless: true
    });
  }
}

export async function renderReportPdfWithPuppeteer(input: {
  tenantId: string;
  clientParam: string;
  adAccountId?: string | null;
  reportType: "simple" | "complete";
  locale: string;
  goalLabel: string;
  preset: PeriodPreset;
  since?: string;
  until?: string;
  selectedMetrics?: MetricKey[];
}): Promise<Uint8Array> {
  const token = createReportPrintToken({
    tenantId: input.tenantId,
    clientParam: input.clientParam,
    adAccountId: input.adAccountId ?? undefined,
    reportType: input.reportType,
    locale: input.locale,
    goalLabel: input.goalLabel,
    preset: input.preset,
    since: input.since,
    until: input.until,
    selectedMetrics: input.selectedMetrics
  });

  const locale = input.locale.startsWith("en") ? "en" : "pt-BR";
  const url = `${appBaseUrl()}/${locale}/report-print?pdfToken=${encodeURIComponent(token)}`;

  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: REPORT_PRINT_WIDTH_PX, height: 1123, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: "networkidle0", timeout: 90_000 });
    await page.waitForSelector('[data-report-print-ready="true"]', { timeout: 90_000 });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "10mm", right: "10mm", bottom: "12mm", left: "10mm" }
    });

    return new Uint8Array(pdf);
  } finally {
    await browser.close();
  }
}
