import type { MetaEventName } from "@/lib/analytics/meta-event-names";

export const CRM_META_STAGES = [
  "lead_qualificado",
  "reuniao_agendada",
  "proposta_enviada",
  "venda_concluida",
  "lead_perdido"
] as const;

export type CrmMetaStage = (typeof CRM_META_STAGES)[number];

export const CRM_META_EVENT_BY_STAGE: Record<CrmMetaStage, MetaEventName | null> = {
  lead_qualificado: "Lead",
  reuniao_agendada: "Schedule",
  proposta_enviada: "InitiateCheckout",
  venda_concluida: "Purchase",
  lead_perdido: null
};

export function isCrmMetaStage(value: unknown): value is CrmMetaStage {
  return typeof value === "string" && (CRM_META_STAGES as readonly string[]).includes(value);
}
