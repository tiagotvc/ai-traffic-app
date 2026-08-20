import { describe, expect, it } from "vitest";

import { CRM_META_EVENT_BY_STAGE, isCrmMetaStage } from "@/lib/crm/meta-stage-events";

describe("CRM_META_EVENT_BY_STAGE", () => {
  it("mapeia as etapas comerciais aprovadas", () => {
    expect(CRM_META_EVENT_BY_STAGE.lead_qualificado).toBe("Lead");
    expect(CRM_META_EVENT_BY_STAGE.reuniao_agendada).toBe("Schedule");
    expect(CRM_META_EVENT_BY_STAGE.proposta_enviada).toBe("InitiateCheckout");
    expect(CRM_META_EVENT_BY_STAGE.venda_concluida).toBe("Purchase");
    expect(CRM_META_EVENT_BY_STAGE.lead_perdido).toBeNull();
  });

  it("rejeita etapas fora da lista", () => {
    expect(isCrmMetaStage("lead_qualificado")).toBe(true);
    expect(isCrmMetaStage("qualquer_coisa")).toBe(false);
  });
});
