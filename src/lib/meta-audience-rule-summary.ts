/** Client-safe rule summary (no Meta API imports). */

export function summarizeAudienceRule(rule: unknown): {
  kind: string;
  pixelId?: string;
  eventName?: string;
  retentionDays?: number;
  sourceType?: string;
  sourceId?: string;
  includeIds?: string[];
  excludeIds?: string[];
} | null {
  if (!rule || typeof rule !== "object") {
    if (typeof rule === "string") {
      try {
        return summarizeAudienceRule(JSON.parse(rule));
      } catch {
        return null;
      }
    }
    return null;
  }

  const r = rule as Record<string, unknown>;
  const inclusions = r.inclusions as { rules?: Array<Record<string, unknown>> } | undefined;
  const rules = inclusions?.rules ?? [];
  const first = rules[0];
  if (!first) return { kind: "unknown" };

  const sources = first.event_sources as Array<{ id?: string; type?: string }> | undefined;
  const source = sources?.[0];
  const event = first.event as { event_name?: string } | undefined;
  const retentionSeconds = Number(first.retention_seconds);
  const retentionDays = retentionSeconds > 0 ? Math.round(retentionSeconds / 86400) : undefined;

  if (source?.type === "pixel") {
    return {
      kind: "website",
      pixelId: source.id,
      eventName: event?.event_name,
      retentionDays
    };
  }

  if (source?.type === "custom_audience") {
    const includeIds = rules
      .flatMap((rule) => (rule.event_sources as Array<{ id?: string; type?: string }>) ?? [])
      .filter((s) => s.type === "custom_audience")
      .map((s) => s.id)
      .filter(Boolean) as string[];
    const exclusions = r.exclusions as { rules?: Array<Record<string, unknown>> } | undefined;
    const excludeIds = (exclusions?.rules ?? [])
      .flatMap((rule) => (rule.event_sources as Array<{ id?: string; type?: string }>) ?? [])
      .filter((s) => s.type === "custom_audience")
      .map((s) => s.id)
      .filter(Boolean) as string[];
    return { kind: "combined", includeIds, excludeIds };
  }

  if (
    source?.type === "page" ||
    source?.type === "ig_business" ||
    source?.type === "video" ||
    source?.type === "lead"
  ) {
    return {
      kind: "engagement",
      sourceType: source.type,
      sourceId: source.id,
      eventName: event?.event_name,
      retentionDays
    };
  }

  return { kind: source?.type ?? "unknown", sourceId: source?.id, eventName: event?.event_name, retentionDays };
}
