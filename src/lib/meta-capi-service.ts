import "server-only";

import { getOrCreateClientMetaSettings } from "@/lib/client-meta-settings";
import { assertFeatureEnabled } from "@/lib/feature-flags/service";
import { sendConversionEvent, type CapiEvent, type CapiResult } from "@/lib/meta-capi";

/** Pixel padrão do cliente: `metaPixelId` ou o 1º de `linkedMetaPixelIds`. */
export async function resolveClientPixelId(clientId: string): Promise<string | null> {
  const s = await getOrCreateClientMetaSettings(clientId);
  return s.metaPixelId || s.linkedMetaPixelIds?.[0] || null;
}

/** Envia um evento de conversão para o pixel do cliente (gate: flag `meta.capi`). */
export async function sendClientConversion(args: {
  clientId: string;
  accessToken: string;
  event: CapiEvent;
  pixelId?: string;
  testEventCode?: string;
}): Promise<CapiResult> {
  await assertFeatureEnabled("meta.capi");
  const pixelId = args.pixelId ?? (await resolveClientPixelId(args.clientId));
  if (!pixelId) {
    return {
      ok: false,
      status: 400,
      error: "Cliente sem pixel vinculado (configure metaPixelId/linkedMetaPixelIds)."
    };
  }
  return sendConversionEvent({
    pixelId,
    accessToken: args.accessToken,
    event: args.event,
    testEventCode: args.testEventCode
  });
}
