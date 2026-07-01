import crypto from "node:crypto";
import { NextResponse } from "next/server";

/**
 * Meta Conversions API (server-side) endpoint.
 *
 * Receives a conversion event from the browser ([[src/lib/analytics.ts]] →
 * trackMetaEvent) and forwards it to Meta with the SAME `event_id` the browser
 * Pixel used, so Meta deduplicates the pair. PII (email/phone) is SHA-256 hashed
 * here — raw values never leave our server.
 *
 * Public route (marketing visitors are logged out) — allow-listed in
 * [[src/lib/public-routes.ts]] `isPublicApiPath`.
 */

const API_VERSION = "v19.0";

function hash(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

type TrackBody = {
  eventName?: string;
  eventId?: string;
  eventSourceUrl?: string;
  customData?: Record<string, unknown>;
  userData?: { email?: string; phone?: string };
};

export async function POST(req: Request) {
  const pixelId = process.env.META_PIXEL_ID?.trim();
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN?.trim();

  // Not configured yet → succeed quietly so the browser Pixel still works alone.
  if (!pixelId || !accessToken) {
    return NextResponse.json({ ok: false, skipped: "capi_not_configured" });
  }

  let body: TrackBody;
  try {
    body = (await req.json()) as TrackBody;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  if (!body.eventName) {
    return NextResponse.json({ ok: false, error: "missing_event_name" }, { status: 400 });
  }

  // IP + UA materially improve Meta's match quality.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ua = req.headers.get("user-agent") ?? undefined;

  const userData: Record<string, unknown> = {};
  if (body.userData?.email) userData.em = [hash(body.userData.email)];
  if (body.userData?.phone) userData.ph = [hash(body.userData.phone.replace(/\D/g, ""))];
  if (ip) userData.client_ip_address = ip;
  if (ua) userData.client_user_agent = ua;

  const payload = {
    data: [
      {
        event_name: body.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: body.eventId,
        action_source: "website",
        event_source_url: body.eventSourceUrl,
        user_data: userData,
        custom_data: body.customData ?? {}
      }
    ]
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );
    const json = (await res.json()) as { error?: { message?: string } };
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: json?.error?.message ?? "capi_error" },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "capi_fetch_failed" }, { status: 502 });
  }
}
