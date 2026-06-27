import "server-only";

import { repositories } from "@/db/repositories";
import { getOrCreateClientMetaSettings } from "@/lib/client-meta-settings";
import { assertFeatureEnabled } from "@/lib/feature-flags/service";
import { sendConversionEvent, type CapiEvent, type CapiResult } from "@/lib/meta-capi";

/** Pixel padrão do cliente: `metaPixelId` ou o 1º de `linkedMetaPixelIds`. */
export async function resolveClientPixelId(clientId: string): Promise<string | null> {
  const s = await getOrCreateClientMetaSettings(clientId);
  return s.metaPixelId || s.linkedMetaPixelIds?.[0] || null;
}

async function logCapiEvent(args: {
  tenantId: string;
  clientId: string;
  pixelId: string | null;
  eventName: string;
  result: CapiResult;
  test: boolean;
}): Promise<void> {
  try {
    const { capiEventLog: repo } = await repositories();
    await repo.save(
      repo.create({
        tenantId: args.tenantId,
        clientId: args.clientId,
        pixelId: args.pixelId,
        eventName: args.eventName,
        success: args.result.ok,
        eventsReceived: args.result.eventsReceived ?? null,
        error: args.result.ok
          ? null
          : typeof args.result.error === "string"
            ? args.result.error.slice(0, 500)
            : JSON.stringify(args.result.error ?? {}).slice(0, 500),
        test: args.test
      })
    );
  } catch {
    /* log é best-effort — nunca derruba o envio */
  }
}

/** Envia um evento de conversão para o pixel do cliente (gate `meta.capi`) + log. */
export async function sendClientConversion(args: {
  tenantId: string;
  clientId: string;
  accessToken: string;
  event: CapiEvent;
  pixelId?: string;
  testEventCode?: string;
}): Promise<CapiResult> {
  await assertFeatureEnabled("meta.capi");
  const pixelId = args.pixelId ?? (await resolveClientPixelId(args.clientId));
  if (!pixelId) {
    const result: CapiResult = {
      ok: false,
      status: 400,
      error: "Cliente sem pixel vinculado (configure metaPixelId/linkedMetaPixelIds)."
    };
    await logCapiEvent({
      tenantId: args.tenantId,
      clientId: args.clientId,
      pixelId: null,
      eventName: args.event.eventName,
      result,
      test: Boolean(args.testEventCode)
    });
    return result;
  }

  const result = await sendConversionEvent({
    pixelId,
    accessToken: args.accessToken,
    event: args.event,
    testEventCode: args.testEventCode
  });
  await logCapiEvent({
    tenantId: args.tenantId,
    clientId: args.clientId,
    pixelId,
    eventName: args.event.eventName,
    result,
    test: Boolean(args.testEventCode)
  });
  return result;
}

/** Resumo de observabilidade (P0.4): últimas 24h + último erro. */
export async function getCapiStatus(tenantId: string, clientId: string) {
  const { capiEventLog: repo } = await repositories();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recent = await repo.find({
    where: { tenantId, clientId },
    order: { createdAt: "DESC" },
    take: 50
  });
  const last24h = recent.filter((r) => r.createdAt >= since);
  const lastError = recent.find((r) => !r.success) ?? null;
  return {
    sent24h: last24h.length,
    success24h: last24h.filter((r) => r.success).length,
    lastEventAt: recent[0]?.createdAt ?? null,
    lastError: lastError
      ? { at: lastError.createdAt, eventName: lastError.eventName, error: lastError.error }
      : null,
    recent: recent.slice(0, 10).map((r) => ({
      at: r.createdAt,
      eventName: r.eventName,
      success: r.success,
      test: r.test,
      eventsReceived: r.eventsReceived ?? null,
      error: r.error ?? null
    }))
  };
}
