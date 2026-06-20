import "server-only";

import { Between, In } from "typeorm";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { repositories } from "@/db/repositories";
import type { Client } from "@/db/entities/Client";
import type { Tenant } from "@/db/entities/Tenant";
import { METRIC_BY_KEY, formatMetricValue, type MetricKey } from "@/lib/dashboard-metrics";
import type { ReportPreviewPayload } from "@/lib/report-preview-types";

function dateNDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export async function buildClientReportPdf(input: {
  tenant: Tenant;
  client: Client;
  days?: number;
}) {
  const days = input.days ?? 30;
  const { metricSnapshot: metricsRepo, adAccount: adAccountRepo, alert: alertRepo } =
    await repositories();
  const accounts = await adAccountRepo.find({ where: { clientId: input.client.id } });
  const accountIds = accounts.map((a) => a.id);
  const start = dateNDaysAgo(days);
  const end = new Date().toISOString().slice(0, 10);

  const rows = accountIds.length
    ? await metricsRepo.find({ where: { adAccountId: In(accountIds), day: Between(start, end) } })
    : [];

  let spend = 0;
  let impressions = 0;
  let clicks = 0;
  let conversions = 0;
  let roasSum = 0;
  let roasCount = 0;
  for (const r of rows) {
    spend += Number(r.spend) || 0;
    impressions += Number(r.impressions) || 0;
    clicks += Number(r.clicks) || 0;
    conversions += Number(r.conversions) || 0;
    const roas = Number(r.roas);
    if (!Number.isNaN(roas) && roas > 0) {
      roasSum += roas;
      roasCount += 1;
    }
  }
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cpc = clicks > 0 ? spend / clicks : 0;
  const roas = roasCount > 0 ? roasSum / roasCount : 0;
  const cpa = conversions > 0 ? spend / conversions : 0;

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const margin = 48;
  const { width } = page.getSize();

  page.drawText(input.tenant.brandName ?? input.tenant.name, {
    x: margin,
    y: 800,
    size: 18,
    font: fontBold,
    color: rgb(0.45, 0.2, 0.9)
  });

  const alerts = await alertRepo.find({
    where: { tenantId: input.tenant.id, clientId: input.client.id, dismissed: false },
    order: { createdAt: "DESC" },
    take: 15
  });

  page.drawText("Relatório de monitoramento", { x: margin, y: 775, size: 12, font });

  const lines = [
    `Cliente: ${input.client.name}`,
    `Período: ${start} → ${end}`,
    "",
    `Gastos: R$ ${spend.toFixed(2)}`,
    `Impressões: ${impressions}`,
    `CTR: ${ctr.toFixed(2)}%`,
    `CPC: R$ ${cpc.toFixed(2)}`,
    `Conversões: ${conversions}`,
    `CPA: R$ ${cpa.toFixed(2)}`,
    `ROAS: ${roas.toFixed(2)}x`
  ];

  let y = 690;
  for (const line of lines) {
    page.drawText(line, { x: margin, y, size: 11, font, color: rgb(0.15, 0.15, 0.2) });
    y -= 18;
  }

  y -= 12;
  page.drawText("Alertas ativos", { x: margin, y, size: 12, font: fontBold });
  y -= 20;
  if (!alerts.length) {
    page.drawText("Nenhum alerta ativo.", { x: margin, y, size: 10, font });
  } else {
    for (const a of alerts) {
      if (y < 80) break;
      page.drawText(`• ${a.title}: ${a.description}`.slice(0, 90), {
        x: margin,
        y,
        size: 9,
        font
      });
      y -= 14;
    }
  }

  return pdfDoc.save();
}

export async function buildClientWhatsappSummary(input: {
  tenant: Tenant;
  client: Client;
}) {
  const { metricSnapshot: metricsRepo, adAccount: adAccountRepo, alert: alertRepo } =
    await repositories();
  const accounts = await adAccountRepo.find({ where: { clientId: input.client.id } });
  const accountIds = accounts.map((a) => a.id);
  const start = dateNDaysAgo(7);
  const end = new Date().toISOString().slice(0, 10);
  const rows = accountIds.length
    ? await metricsRepo.find({ where: { adAccountId: In(accountIds), day: Between(start, end) } })
    : [];

  let spend = 0;
  let conversions = 0;
  for (const r of rows) {
    spend += Number(r.spend) || 0;
    conversions += Number(r.conversions) || 0;
  }

  const critical = await alertRepo.count({
    where: { tenantId: input.tenant.id, clientId: input.client.id, dismissed: false, severity: "critical" }
  });

  return [
    `📊 *${input.client.name}* — resumo 7d`,
    `Gasto: R$ ${spend.toFixed(2)}`,
    `Conversões: ${conversions}`,
    `CPA: ${conversions > 0 ? `R$ ${(spend / conversions).toFixed(2)}` : "—"}`,
    `Alertas críticos: ${critical}`,
    `— ${input.tenant.brandName ?? input.tenant.name}`
  ].join("\n");
}

const PDF_PAGE = { w: 595.28, h: 841.89 };
const PDF_MARGIN = 48;

function pdfWrap(text: string, maxChars: number): string[] {
  const out: string[] = [];
  for (const paragraph of text.split(/\n+/)) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (!words.length) continue;
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (next.length > maxChars) {
        if (line) out.push(line);
        line = word.length > maxChars ? word.slice(0, maxChars) : word;
      } else {
        line = next;
      }
    }
    if (line) out.push(line);
  }
  return out.length ? out : [""];
}

type PdfCtx = {
  doc: PDFDocument;
  page: ReturnType<PDFDocument["addPage"]>;
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  fontBold: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  y: number;
};

function pdfEnsureSpace(ctx: PdfCtx, needed: number): PdfCtx {
  if (ctx.y - needed >= PDF_MARGIN) return ctx;
  const page = ctx.doc.addPage([PDF_PAGE.w, PDF_PAGE.h]);
  return { ...ctx, page, y: PDF_PAGE.h - PDF_MARGIN };
}

function pdfLine(ctx: PdfCtx, text: string, opts?: { bold?: boolean; size?: number; gap?: number }): PdfCtx {
  const size = opts?.size ?? 11;
  const gap = opts?.gap ?? 16;
  const next = pdfEnsureSpace(ctx, gap);
  next.page.drawText(text.slice(0, 120), {
    x: PDF_MARGIN,
    y: next.y,
    size,
    font: opts?.bold ? next.fontBold : next.font,
    color: rgb(0.15, 0.15, 0.2)
  });
  return { ...next, y: next.y - gap };
}

function pdfParagraph(ctx: PdfCtx, text: string, opts?: { bold?: boolean; size?: number }): PdfCtx {
  let cur = ctx;
  for (const line of pdfWrap(text, 92)) {
    cur = pdfLine(cur, line, { ...opts, gap: (opts?.size ?? 11) + 5 });
  }
  return { ...cur, y: cur.y - 4 };
}

function pdfSection(ctx: PdfCtx, title: string): PdfCtx {
  let cur = pdfEnsureSpace(ctx, 28);
  cur = pdfLine(cur, title, { bold: true, size: 12, gap: 18 });
  return { ...cur, y: cur.y - 4 };
}

export async function buildReportPdfFromPreview(input: {
  tenant: Tenant;
  payload: ReportPreviewPayload;
  reportType: "simple" | "complete";
  locale: string;
  selectedMetrics?: MetricKey[];
}): Promise<Uint8Array> {
  const { tenant, payload, reportType, locale } = input;
  const metrics =
    input.selectedMetrics && input.selectedMetrics.length > 0
      ? input.selectedMetrics
      : (["spend", "clicks", payload.client.goalMetric, "ctr", "cpm"] as MetricKey[]);

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  let page = doc.addPage([PDF_PAGE.w, PDF_PAGE.h]);

  page.drawText(tenant.brandName ?? tenant.name, {
    x: PDF_MARGIN,
    y: PDF_PAGE.h - PDF_MARGIN,
    size: 16,
    font: fontBold,
    color: rgb(0.45, 0.2, 0.9)
  });

  let ctx: PdfCtx = { doc, page, font, fontBold, y: PDF_PAGE.h - PDF_MARGIN - 28 };

  ctx = pdfLine(ctx, reportType === "complete" ? "Relatório completo" : "Relatório de performance", {
    bold: true,
    size: 13,
    gap: 20
  });
  ctx = pdfLine(ctx, `Cliente: ${payload.client.name}`);
  if (payload.adAccount?.label) ctx = pdfLine(ctx, `Conta: ${payload.adAccount.label}`);
  ctx = pdfLine(ctx, `Período: ${payload.period.currentLabel}`);
  ctx = pdfLine(ctx, `Comparado com: ${payload.period.previousLabel}`, { gap: 22 });

  ctx = pdfSection(ctx, "Métricas principais");
  for (const key of metrics.slice(0, 8)) {
    const label = METRIC_BY_KEY[key]?.label ?? key;
    ctx = pdfLine(ctx, `${label}: ${formatMetricValue(key, payload.summary[key] ?? 0, locale)}`, {
      size: 10,
      gap: 14
    });
  }

  ctx = pdfSection(ctx, "Resumo");
  ctx = pdfParagraph(ctx, payload.narrative, { size: 10 });

  if (reportType === "complete" && payload.aiAnalysis?.keyFindings.length) {
    ctx = pdfSection(ctx, "Análise Claude — principais achados");
    for (const finding of payload.aiAnalysis.keyFindings) {
      ctx = pdfParagraph(ctx, `• ${finding}`, { size: 10 });
    }
  }

  if (reportType === "complete" && payload.recommendations.length) {
    ctx = pdfSection(ctx, "Recomendações");
    for (const rec of payload.recommendations.slice(0, 5)) {
      ctx = pdfLine(ctx, rec.title, { bold: true, size: 10, gap: 14 });
      ctx = pdfParagraph(ctx, rec.body, { size: 10 });
    }
  }

  if (payload.campaigns.length) {
    ctx = pdfSection(ctx, "Campanhas por investimento");
    for (const c of payload.campaigns.slice(0, 8)) {
      ctx = pdfLine(
        ctx,
        `• ${c.name.slice(0, 65)} — R$ ${c.spend.toFixed(2)} (${c.sharePct.toFixed(0)}%)`,
        { size: 10, gap: 14 }
      );
    }
  }

  ctx = pdfLine(ctx, `Gerado em ${new Date().toLocaleString(locale === "en" ? "en-US" : "pt-BR")}`, {
    size: 9,
    gap: 14
  });

  return doc.save();
}
