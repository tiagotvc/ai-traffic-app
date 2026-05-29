import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Between, In } from "typeorm";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";

function dateNDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export async function POST() {
  const { tenant, defaultClient } = await getAppContext();

  const { metricSnapshot: metricsRepo, adAccount: adAccountRepo, alert: alertRepo } =
    await repositories();
  const accounts = await adAccountRepo.find({ where: { clientId: defaultClient.id } });
  const accountIds = accounts.map((a) => a.id);
  const start = dateNDaysAgo(30);
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
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { width } = page.getSize();
  const margin = 48;

  page.drawText(tenant.brandName ?? tenant.name, {
    x: margin,
    y: 800,
    size: 18,
    font: fontBold,
    color: rgb(0.45, 0.2, 0.9)
  });
  const alerts = await alertRepo.find({
    where: { tenantId: tenant.id, dismissed: false },
    order: { createdAt: "DESC" },
    take: 15
  });

  page.drawText("Relatório de monitoramento", {
    x: margin,
    y: 775,
    size: 12,
    font
  });

  page.drawRectangle({
    x: margin,
    y: 720,
    width: width - margin * 2,
    height: 1,
    color: rgb(0.2, 0.2, 0.25)
  });

  const lines = [
    `Cliente: ${defaultClient.name}`,
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
    page.drawText(line, { x: margin, y, size: 11, font, color: rgb(0.9, 0.9, 0.92) });
    y -= 18;
  }

  y -= 12;
  page.drawText("Alertas ativos", { x: margin, y, size: 12, font: fontBold, color: rgb(0.95, 0.4, 0.4) });
  y -= 20;
  if (!alerts.length) {
    page.drawText("Nenhum alerta no período.", { x: margin, y, size: 10, font });
  } else {
    for (const a of alerts) {
      if (y < 80) break;
      page.drawText(`• ${a.title}: ${a.description}`.slice(0, 90), {
        x: margin,
        y,
        size: 9,
        font,
        color: rgb(0.85, 0.85, 0.88)
      });
      y -= 14;
    }
  }

  const bytes = await pdfDoc.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": "attachment; filename=\"relatorio.pdf\""
    }
  });
}

