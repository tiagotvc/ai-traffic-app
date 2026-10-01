/**
 * Regra de público de engajamento com VÍDEO no formato antigo da Meta.
 *
 * A Meta recusa o formato novo (`inclusions` / `event_sources`) para vídeo:
 * "This audience rule format is not available for video engagement custom
 * audience. Please use previous audience rule format instead." (código 100).
 * O formato antigo é uma lista `{ event_name, object_id }`, um item por vídeo,
 * com `subtype=ENGAGEMENT` e a retenção em `retention_days`.
 */

/** Evento do catálogo do Orion → nome do evento no formato antigo da Meta. */
const LEGACY_VIDEO_EVENTS: Record<string, string> = {
  video_view: "video_watched",
  video_view_3s: "video_watched",
  video_view_10s: "video_view_10s",
  video_view_15s: "video_view_15s",
  video_view_25: "video_view_25_percent",
  video_view_50: "video_view_50_percent",
  video_view_75: "video_view_75_percent",
  // A Meta chama "assistiu 95%" de video_completed.
  video_view_95: "video_completed",
  video_completed: "video_completed"
};

export function legacyVideoEventName(orionEvent: string): string {
  const mapped = LEGACY_VIDEO_EVENTS[orionEvent];
  if (!mapped) throw new Error(`Evento de vídeo sem equivalente na Meta: ${orionEvent}`);
  return mapped;
}

export function buildLegacyVideoAudienceRule(input: {
  videoIds: string[];
  eventName: string;
}): Array<{ event_name: string; object_id: string }> {
  const ids = [...new Set(input.videoIds.map((id) => id.trim()).filter(Boolean))];
  if (!ids.length) throw new Error("Selecione ao menos um vídeo");
  const event_name = legacyVideoEventName(input.eventName);
  return ids.map((object_id) => ({ event_name, object_id }));
}

/**
 * A Meta só aceita vídeo ligado a uma Página (erro #2654 "No Page or New Page
 * Experience Association"). Ela recusa um vídeo por vez e diz qual: devolve
 * esse ID para o chamador tirar o vídeo e tentar de novo.
 */
export function parseVideoWithoutPageError(message: string): string | null {
  if (!/isn't associated with a Page|No Page or New Page Experience/i.test(message)) return null;
  return message.match(/with video (\d+)/i)?.[1] ?? null;
}
