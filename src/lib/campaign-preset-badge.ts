/** Classes e helpers para badges de tipo de campanha (cores por preset). */

export function campaignPresetBadgeClass(preset: string): string {
  if (preset.startsWith("custom:")) return "ui-campaign-table-tipo--custom";
  const map: Record<string, string> = {
    default: "ui-campaign-table-tipo--default",
    lead_whatsapp: "ui-campaign-table-tipo--lead_whatsapp",
    lead_site: "ui-campaign-table-tipo--lead_site",
    sales: "ui-campaign-table-tipo--sales",
    reach: "ui-campaign-table-tipo--reach"
  };
  return map[preset] ?? "ui-campaign-table-tipo--custom";
}
