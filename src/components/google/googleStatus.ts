/** Rótulo localizado de status de entidade Google Ads (anúncio/grupo/campanha). */
const STATUS_LABELS: Record<string, { pt: string; en: string }> = {
  ENABLED: { pt: "Ativo", en: "Active" },
  PAUSED: { pt: "Pausado", en: "Paused" },
  REMOVED: { pt: "Removido", en: "Removed" }
};

export function googleStatusLabel(status: string, locale: string): string {
  const lang = locale.startsWith("en") ? "en" : "pt";
  return STATUS_LABELS[status]?.[lang] ?? status;
}

export function googleStatusColor(status: string): string {
  if (status === "ENABLED") return "text-emerald-400";
  if (status === "PAUSED") return "text-amber-400";
  return "text-[var(--text-dimmer)]";
}
