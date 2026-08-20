export const LEAD_ORIGIN_NAMES = {
  utm_campaign: {
    "120248690424420474": "LEADS - TESTE GRATIS - 17-08"
  },
  utm_term: {
    "120248690424430474": "Abertão até 48 anos"
  },
  utm_content: {
    "120248735437980474": "ad08-relatorios-meme",
    "120248698463920474": "ad07-relatorios",
    "120248690424410474": "ad06-cockpit multi-cliente",
    "120248698487790474": "ad09-ranking"
  }
} as const;

export type LeadOriginNameField = keyof typeof LEAD_ORIGIN_NAMES;

export function resolveLeadOriginName(field: string, value: string): string | null {
  if (!(field in LEAD_ORIGIN_NAMES)) return null;

  const names = LEAD_ORIGIN_NAMES[field as LeadOriginNameField] as Record<string, string>;
  return names[value.trim()] ?? null;
}
