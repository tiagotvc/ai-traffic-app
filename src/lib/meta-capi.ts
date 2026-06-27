import "server-only";

import { hashUserData, type CapiUserDataRaw } from "@/lib/meta-capi-hash";

/**
 * Cliente da Conversions API (CAPI) da Meta — envio server-to-server de eventos
 * de conversão (`POST /{pixel-id}/events`). Recupera sinal perdido por iOS/ad
 * blockers. Janela de match real é ~10–45% (não "100%") — comunicar honestamente.
 */

const GRAPH_BASE = "https://graph.facebook.com/v20.0";

export type CapiActionSource =
  | "website"
  | "app"
  | "phone_call"
  | "chat"
  | "email"
  | "other"
  | "system_generated"
  | "physical_store";

export type CapiEvent = {
  eventName: string; // "Purchase", "Lead", "PageView"...
  eventTime?: number; // unix seconds; default = agora
  actionSource?: CapiActionSource;
  /** dedupe com o pixel do navegador — mesmo valor nos dois lados */
  eventId?: string;
  eventSourceUrl?: string;
  userData: CapiUserDataRaw;
  customData?: Record<string, unknown>; // value, currency, content_ids...
};

export type CapiResult = {
  ok: boolean;
  status: number;
  eventsReceived?: number;
  fbtraceId?: string;
  messages?: unknown;
  error?: unknown;
};

export async function sendConversionEvent(args: {
  pixelId: string;
  accessToken: string;
  event: CapiEvent;
  /** quando setado, o evento aparece no "Test Events" do Events Manager */
  testEventCode?: string;
}): Promise<CapiResult> {
  const e = args.event;
  const body: Record<string, unknown> = {
    data: [
      {
        event_name: e.eventName,
        event_time: e.eventTime ?? Math.floor(Date.now() / 1000),
        action_source: e.actionSource ?? "website",
        ...(e.eventId ? { event_id: e.eventId } : {}),
        ...(e.eventSourceUrl ? { event_source_url: e.eventSourceUrl } : {}),
        user_data: hashUserData(e.userData),
        ...(e.customData ? { custom_data: e.customData } : {})
      }
    ],
    ...(args.testEventCode ? { test_event_code: args.testEventCode } : {})
  };

  const url = `${GRAPH_BASE}/${encodeURIComponent(args.pixelId)}/events?access_token=${encodeURIComponent(
    args.accessToken
  )}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });

  const json = (await res.json().catch(() => ({}))) as {
    events_received?: number;
    fbtrace_id?: string;
    messages?: unknown;
    error?: unknown;
  };

  return {
    ok: res.ok,
    status: res.status,
    eventsReceived: json.events_received,
    fbtraceId: json.fbtrace_id,
    messages: json.messages,
    error: res.ok ? undefined : (json.error ?? json)
  };
}
