import { describe, expect, it } from "vitest";

import { resolveLeadOriginName } from "@/lib/lead-origin-names";

describe("resolveLeadOriginName", () => {
  it("converte os IDs cadastrados nos nomes informados", () => {
    expect(resolveLeadOriginName("utm_campaign", "120248690424420474")).toBe(
      "LEADS - TESTE GRATIS - 17-08"
    );
    expect(resolveLeadOriginName("utm_term", "120248690424430474")).toBe(
      "Abertão até 48 anos"
    );
    expect(resolveLeadOriginName("utm_content", "120248735437980474")).toBe(
      "ad08-relatorios-meme"
    );
    expect(resolveLeadOriginName("utm_content", "120248698463920474")).toBe(
      "ad07-relatorios"
    );
    expect(resolveLeadOriginName("utm_content", "120248690424410474")).toBe(
      "ad06-cockpit multi-cliente"
    );
    expect(resolveLeadOriginName("utm_content", "120248698487790474")).toBe(
      "ad09-ranking"
    );
  });

  it("mantém o fallback para IDs e campos desconhecidos", () => {
    expect(resolveLeadOriginName("utm_campaign", "999")).toBeNull();
    expect(resolveLeadOriginName("fbclid", "abc")).toBeNull();
  });
});
