import "server-only";

import { hashUserData, type CapiUserDataRaw } from "@/lib/meta-capi-hash";

/**
 * Envio de eventos ao pixel da própria Orion pela Conversions API.
 *
 * Não confundir com [[src/lib/meta-capi-service.ts]]: aquele manda eventos para o
 * pixel *do cliente da agência* (funcionalidade do produto). Este aqui é o rastreio
 * do nosso próprio funil de vendas, com `META_PIXEL_ID`/`META_CAPI_ACCESS_TOKEN`.
 *
 * LGPD: esta função NÃO checa consentimento — quem chama precisa checar, porque a
 * origem do consentimento muda conforme o contexto (cookie do request numa server
 * action, coluna do banco num webhook de cobrança, onde não há navegador).
 * Ver [[src/lib/server-consent.ts]] e `users.analytics_consent`.
 */

const META_API_VERSION = "v20.0";

export type MetaServerEventName =
  | "Lead"
  | "CompleteRegistration"
  | "StartTrial"
  | "Subscribe"
  | "Purchase";

export type MetaServerEvent = {
  eventName: MetaServerEventName;
  /** Id determinístico (ex.: `signup_${userId}`) — dedup contra o Pixel e contra retry. */
  eventId: string;
  userData?: CapiUserDataRaw;
  customData?: Record<string, unknown>;
  eventSourceUrl?: string;
  /** Segundos epoch. Padrão: agora. A Meta rejeita eventos com mais de 7 dias. */
  eventTime?: number;
};

/**
 * Manda um evento e devolve se deu certo. Nunca lança — rastreio não pode derrubar
 * cadastro nem cobrança. Sem as variáveis de ambiente configuradas, sai em silêncio.
 */
export async function sendMetaServerEvent(event: MetaServerEvent): Promise<boolean> {
  const pixelId = process.env.META_PIXEL_ID?.trim();
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN?.trim();
  if (!pixelId || !accessToken) return false;

  const testEventCode = process.env.META_TEST_EVENT_CODE?.trim();

  const payload = {
    data: [
      {
        event_name: event.eventName,
        event_time: event.eventTime ?? Math.floor(Date.now() / 1000),
        event_id: event.eventId,
        action_source: "website",
        ...(event.eventSourceUrl ? { event_source_url: event.eventSourceUrl } : {}),
        user_data: hashUserData(event.userData ?? {}),
        ...(event.customData ? { custom_data: event.customData } : {})
      }
    ],
    ...(testEventCode ? { test_event_code: testEventCode } : {})
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${META_API_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );

    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      console.error(
        `[meta-server-events] ${event.eventName} falhou:`,
        json?.error?.message ?? res.status
      );
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[meta-server-events] ${event.eventName} falhou:`, err);
    return false;
  }
}
