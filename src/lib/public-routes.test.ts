import { describe, expect, it } from "vitest";

import { isPublicApiPath } from "@/lib/public-routes";

describe("isPublicApiPath", () => {
  it("deixa o webhook CRM chegar à autenticação por segredo da própria rota", () => {
    expect(isPublicApiPath("/api/integrations/crm/meta-event")).toBe(true);
  });

  it("não abre outras rotas da integração CRM por prefixo", () => {
    expect(isPublicApiPath("/api/integrations/crm/qualquer-outra")).toBe(false);
  });
});
