/**
 * Abas do Criador de públicos em lote. Nova aba (Instagram, Site, Lista…) =
 * nova entrada aqui + um builder registrado em `AudienceBulkCreator`.
 */
export const BULK_AUDIENCE_TABS = [
  { id: "video_view", labelKey: "tabs.videoView" },
  { id: "lookalike", labelKey: "tabs.lookalike" }
] as const;

export type BulkAudienceTabId = (typeof BULK_AUDIENCE_TABS)[number]["id"];

export function isBulkAudienceTabId(value: string | null | undefined): value is BulkAudienceTabId {
  return BULK_AUDIENCE_TABS.some((t) => t.id === value);
}
