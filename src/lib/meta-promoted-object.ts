/**
 * Maps draft conversionEvent to Meta promoted_object fields.
 * - std:LEAD → custom_event_type
 * - numeric id → custom_conversion_id (account custom conversion)
 * - plain LEAD (legacy drafts) → custom_event_type
 */
export function applyConversionEventToPromoted(
  promoted: Record<string, string>,
  conversionEvent: string,
  fallbackStandard?: string
): void {
  const raw = conversionEvent.trim() || fallbackStandard?.trim() || "";
  if (!raw) return;

  delete promoted.custom_event_type;
  delete promoted.custom_conversion_id;

  if (raw.startsWith("std:")) {
    promoted.custom_event_type = raw.slice(4);
    return;
  }
  if (/^\d+$/.test(raw)) {
    promoted.custom_conversion_id = raw;
    return;
  }
  promoted.custom_event_type = raw;
}

export function conversionEventFromPromotedObject(
  promoted: Record<string, unknown> | undefined
): string {
  if (!promoted) return "";
  const customId = promoted.custom_conversion_id;
  if (typeof customId === "string" && customId.trim()) return customId.trim();
  const eventType = promoted.custom_event_type;
  if (typeof eventType === "string" && eventType.trim()) {
    return eventType.includes(":") ? eventType.trim() : `std:${eventType.trim()}`;
  }
  return "";
}
