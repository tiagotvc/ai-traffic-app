/** Tradução dos tipos de correspondência do Google Ads (EXACT/PHRASE/BROAD). */
const MATCH_LABELS: Record<string, { pt: string; en: string }> = {
  EXACT: { pt: "Exata", en: "Exact" },
  PHRASE: { pt: "Frase", en: "Phrase" },
  BROAD: { pt: "Ampla", en: "Broad" }
};

export function matchTypeLabel(raw: string | null | undefined, locale: string): string {
  if (!raw) return "";
  const m = MATCH_LABELS[raw.toUpperCase()];
  if (!m) return raw;
  return locale.startsWith("pt") ? m.pt : m.en;
}
