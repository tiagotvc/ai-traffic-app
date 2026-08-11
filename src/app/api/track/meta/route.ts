import { NextResponse } from "next/server";

import { isMetaEventName } from "@/lib/analytics/meta-event-names";
import { sendMetaServerEvent } from "@/lib/analytics/meta-server-events";
import { hasServerAnalyticsConsent, readMetaBrowserCookies } from "@/lib/server-consent";

/**
 * Conversions API (server) para os eventos disparados pelo navegador.
 *
 * Recebe uma conversão de [[src/lib/analytics.ts]] `trackMetaEvent` e repassa à Meta
 * com o MESMO `event_id` que o Pixel usou, para a Meta deduplicar o par.
 *
 * Rota **pública** (visitante de marketing está deslogado) — liberada em
 * [[src/lib/public-routes.ts]] `isPublicApiPath`. Por ser pública, tudo que entra é
 * hostil até prova em contrário:
 *
 *   • consentimento é conferido AQUI, não só no navegador (LGPD — o gate do cliente
 *     não vale nada contra um POST direto);
 *   • `eventName` passa por allowlist: sem isso qualquer um injeta `Purchase` de valor
 *     alto e envenena a otimização das campanhas;
 *   • `customData` é filtrado por chave conhecida e os textos são truncados;
 *   • limite por IP, best-effort.
 *
 * O envio em si é do [[src/lib/analytics/meta-server-events.ts]] — que já normaliza e
 * hasheia PII, manda `test_event_code` e fixa a versão do Graph. Antes esta rota tinha
 * uma implementação paralela (hash próprio, Graph v19, sem fbp/fbc) que divergiu.
 */

/** Chaves de `custom_data` que o funil realmente usa (ver docs/analytics/README.md). */
const ALLOWED_CUSTOM_KEYS = new Set([
  "value",
  "currency",
  "content_name",
  "content_ids",
  "content_type",
  "content_category",
  "num_items",
  "order_id"
]);

const MAX_STR = 200;
const MAX_IDS = 20;

/**
 * Limitador por IP. Em serverless a memória é por instância, então isso não é uma
 * garantia — é um teto barato contra script ingênuo. Abuso sério exige WAF/Edge.
 */
const RATE_LIMIT_MAX = 60;
const RATE_LIMIT_WINDOW_MS = 60_000;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    if (hits.size > 5_000) {
      for (const [key, v] of hits) if (now > v.resetAt) hits.delete(key);
    }
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

/** Mantém só chaves conhecidas, com tipos e tamanhos sob controle. */
function sanitizeCustomData(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!ALLOWED_CUSTOM_KEYS.has(key)) continue;
    if (typeof value === "number" && Number.isFinite(value)) out[key] = value;
    else if (typeof value === "string") out[key] = value.slice(0, MAX_STR);
    else if (Array.isArray(value)) {
      out[key] = value
        .filter((v) => typeof v === "string" || typeof v === "number")
        .slice(0, MAX_IDS)
        .map((v) => (typeof v === "string" ? v.slice(0, MAX_STR) : v));
    }
  }
  return out;
}

type TrackBody = {
  eventName?: unknown;
  eventId?: unknown;
  eventSourceUrl?: unknown;
  customData?: unknown;
  userData?: { email?: unknown; phone?: unknown };
};

export async function POST(req: Request) {
  // LGPD antes de tudo: sem aceite explícito nada sai daqui. Silencioso de propósito —
  // recusar rastreio não é erro do cliente.
  if (!(await hasServerAnalyticsConsent())) {
    return NextResponse.json({ ok: false, skipped: "no_consent" });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (ip && rateLimited(ip)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  let body: TrackBody;
  try {
    body = (await req.json()) as TrackBody;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  // Allowlist: nome fora da lista não chega na Meta.
  if (!isMetaEventName(body.eventName)) {
    return NextResponse.json({ ok: false, error: "unsupported_event_name" }, { status: 400 });
  }
  // Sem event_id não há dedup — e sem dedup o evento conta em dobro com o Pixel.
  if (typeof body.eventId !== "string" || !body.eventId.trim()) {
    return NextResponse.json({ ok: false, error: "missing_event_id" }, { status: 400 });
  }

  const ua = req.headers.get("user-agent") ?? undefined;
  // Cookies do Pixel: os sinais que mais pesam na correspondência de tráfego pago.
  const { fbp, fbc } = await readMetaBrowserCookies();

  const email = typeof body.userData?.email === "string" ? body.userData.email : undefined;
  const phone = typeof body.userData?.phone === "string" ? body.userData.phone : undefined;

  const ok = await sendMetaServerEvent({
    eventName: body.eventName,
    eventId: body.eventId.trim().slice(0, 100),
    userData: {
      ...(email ? { email } : {}),
      ...(phone ? { phone } : {}),
      ...(ip ? { clientIpAddress: ip } : {}),
      ...(ua ? { clientUserAgent: ua } : {}),
      ...(fbp ? { fbp } : {}),
      ...(fbc ? { fbc } : {})
    },
    customData: sanitizeCustomData(body.customData),
    ...(typeof body.eventSourceUrl === "string"
      ? { eventSourceUrl: body.eventSourceUrl.slice(0, 500) }
      : {})
  });

  // `false` também cobre "CAPI não configurado" — o Pixel do navegador já cobriu o
  // evento, então isso nunca vira erro visível para o visitante.
  return NextResponse.json({ ok });
}
