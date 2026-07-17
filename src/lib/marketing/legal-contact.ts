/**
 * Canais oficiais — alinhados aos documentos institucionais e exigências Meta/LGPD.
 * Temos um ÚNICO e-mail de contato (support@). `commercialEmail` e `privacyEmail` são
 * aliases mantidos apontando para o mesmo endereço para não quebrar referências antigas.
 */
const SUPPORT_EMAIL = "support@orionagency.com.br";

export const LEGAL_CONTACT = {
  platformName: "Orion Agency",
  companyLocation: "Novo Hamburgo, Rio Grande do Sul, Brasil",
  supportEmail: SUPPORT_EMAIL,
  /** @deprecated usar supportEmail — alias para o e-mail único de contato. */
  commercialEmail: SUPPORT_EMAIL,
  /** @deprecated usar supportEmail — alias para o e-mail único de contato. */
  privacyEmail: SUPPORT_EMAIL,
  termsUpdatedDate: "17 de julho de 2026",
  termsUpdatedDateEn: "July 17, 2026",
  /** Versão dos Termos/Privacidade para registrar o aceite do usuário. Bump ao alterar os documentos. */
  termsVersion: "2026-07-17",
  supportHours: "Segunda a sexta-feira, das 09h às 18h (horário de Brasília)",
  supportHoursEn: "Monday to Friday, 9:00 AM to 6:00 PM (Brasília time)",
  /** SLA de resposta exibido nas páginas de contato. */
  supportResponse: "Respondemos em até 48 horas em dias úteis.",
  supportResponseEn: "We reply within 48 business hours."
} as const;
