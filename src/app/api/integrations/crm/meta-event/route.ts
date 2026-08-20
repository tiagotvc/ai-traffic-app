import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { buildFbcFromFbclid } from "@/lib/analytics/attribution";
import { sendMetaServerEvent } from "@/lib/analytics/meta-server-events";
import { recordBillingEvent } from "@/lib/billing/jobs";
import {
  CRM_META_EVENT_BY_STAGE,
  isCrmMetaStage
} from "@/lib/crm/meta-stage-events";
import { repositories } from "@/db/repositories";

const BodySchema = z.object({
  secret: z.string().min(1),
  email: z.string().email(),
  etapa: z.string().min(1),
  alterado_em: z.string().datetime()
});

function validSecret(received: string): boolean {
  const expected = process.env.CRM_SHEET_WEBHOOK_SECRET?.trim();
  if (!expected) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, status: "error", error: "invalid_request" }, { status: 400 });
  }
  if (!validSecret(parsed.data.secret)) {
    return NextResponse.json({ ok: false, status: "error", error: "unauthorized" }, { status: 401 });
  }
  if (!isCrmMetaStage(parsed.data.etapa)) {
    return NextResponse.json({ ok: false, status: "error", error: "invalid_stage" }, { status: 400 });
  }

  const changedAt = new Date(parsed.data.alterado_em);
  const ageMs = Date.now() - changedAt.getTime();
  if (ageMs < -5 * 60_000 || ageMs > 7 * 24 * 60 * 60_000) {
    return NextResponse.json({ ok: true, status: "ignored", reason: "event_time_out_of_range" });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const { user: userRepo } = await repositories();
  const user = await userRepo
    .createQueryBuilder("u")
    .where("LOWER(u.email) = :email", { email })
    .getOne();
  if (!user) return NextResponse.json({ ok: true, status: "ignored", reason: "user_not_found" });
  if (user.analyticsConsent !== "accepted") {
    return NextResponse.json({ ok: true, status: "ignored", reason: "consent_required" });
  }

  const eventName = CRM_META_EVENT_BY_STAGE[parsed.data.etapa];
  if (!eventName) {
    return NextResponse.json({ ok: true, status: "ignored", reason: "no_meta_event" });
  }

  const fingerprint = createHash("sha256")
    .update(`${email}:${parsed.data.etapa}:${parsed.data.alterado_em}`)
    .digest("hex")
    .slice(0, 24);
  const { isNew } = await recordBillingEvent({
    provider: "google_sheets",
    eventType: "crm_meta_stage",
    idempotencyKey: `crm-meta:${fingerprint}`,
    tenantId: user.tenantId,
    payload: { email, etapa: parsed.data.etapa, alteradoEm: parsed.data.alterado_em }
  });
  if (!isNew) return NextResponse.json({ ok: true, status: "duplicate" });

  const attribution = user.signupAttribution ?? {};
  const fbc = attribution.fbc ?? buildFbcFromFbclid(attribution.fbclid, user.createdAt.getTime());
  const sent = await sendMetaServerEvent({
    eventName,
    eventId: `crm_${fingerprint}`,
    eventTime: Math.floor(changedAt.getTime() / 1000),
    userData: {
      email: user.email,
      externalId: user.tenantId,
      ...(attribution.fbp ? { fbp: attribution.fbp } : {}),
      ...(fbc ? { fbc } : {})
    },
    customData: {
      content_name: "crm_stage",
      crm_stage: parsed.data.etapa
    }
  });

  if (!sent) {
    return NextResponse.json({ ok: false, status: "error", error: "meta_send_failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true, status: "sent", event: eventName });
}
