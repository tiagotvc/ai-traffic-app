import { NextResponse } from "next/server";
import { LessThanOrEqual } from "typeorm";

import { repositories } from "@/db/repositories";
import { buildClientReportPdf, buildClientWhatsappSummary } from "@/lib/report-generate";

function authCron(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  if (!authCron(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { reportSchedule: repo, tenant: tenantRepo, client: clientRepo } = await repositories();
  const now = new Date();
  const due = await repo.find({
    where: { enabled: true, nextRunAt: LessThanOrEqual(now) }
  });

  const processed: string[] = [];

  for (const schedule of due) {
    const tenant = await tenantRepo.findOne({ where: { id: schedule.tenantId } });
    if (!tenant) continue;

    const client = schedule.clientId
      ? await clientRepo.findOne({ where: { id: schedule.clientId } })
      : await clientRepo.findOne({ where: { tenantId: tenant.id }, order: { createdAt: "ASC" } });
    if (!client) continue;

    if (schedule.format === "whatsapp") {
      await buildClientWhatsappSummary({ tenant, client });
    } else {
      await buildClientReportPdf({ tenant, client });
    }

    schedule.lastRunAt = now;
    const next = new Date(now);
    if (schedule.frequency === "daily") next.setUTCDate(next.getUTCDate() + 1);
    else if (schedule.frequency === "weekly") next.setUTCDate(next.getUTCDate() + 7);
    else next.setUTCMonth(next.getUTCMonth() + 1);
    schedule.nextRunAt = next;
    await repo.save(schedule);
    processed.push(schedule.id);

    const webhook = process.env.REPORT_WEBHOOK_URL?.trim();
    if (webhook && schedule.recipients.length) {
      try {
        await fetch(webhook, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            scheduleId: schedule.id,
            clientName: client.name,
            format: schedule.format,
            recipients: schedule.recipients
          })
        });
      } catch {
        /* ignore */
      }
    }
  }

  return NextResponse.json({ ok: true, processed: processed.length, ids: processed });
}
