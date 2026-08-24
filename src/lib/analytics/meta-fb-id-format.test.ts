import { describe, expect, it } from "vitest";

import {
  FB_SUBDOMAIN_INDEX,
  buildFbcFromFbclid,
  buildFbp,
  readFbclid
} from "@/lib/analytics/meta-fb-id-format";

/** A implementação vive em attribution.ts; aqui só o apelido local do teste. */
const buildFbc = (fbclid: string, nowMs: number) => buildFbcFromFbclid(fbclid, nowMs);

/**
 * Formato exigido pela Meta: `fb.<subdomainIndex>.<criacaoEmMs>.<valor>`.
 * Valor fora desse formato é aceito no envio e descartado na correspondência, ou seja,
 * falha silenciosa: some da nota sem aparecer como erro. Daí o teste.
 */
const FB_SHAPE = /^fb\.\d+\.\d+\..+$/;

describe("buildFbc", () => {
  it("monta o Click ID com o fbclid intacto", () => {
    const fbc = buildFbc("IwAR0abc-XYZ_123", 1_754_930_000_000);
    expect(fbc).toBe("fb.1.1754930000000.IwAR0abc-XYZ_123");
    expect(fbc).toMatch(FB_SHAPE);
  });

  it("não altera fbclid com caracteres de URL segura", () => {
    // O fbclid da Meta usa base64url: hífen e underscore são normais e não podem
    // ser escapados nem cortados.
    expect(buildFbc("A-B_c.d", 1)).toBe("fb.1.1.A-B_c.d");
  });
});

describe("buildFbp", () => {
  it("monta o Browser ID no formato esperado", () => {
    const fbp = buildFbp(1_754_930_000_000, 1234567890);
    expect(fbp).toBe("fb.1.1754930000000.1234567890");
    expect(fbp).toMatch(FB_SHAPE);
  });

  it("usa o mesmo subdomainIndex do fbc, senão os dois lados divergem", () => {
    expect(buildFbp(1, 2).split(".")[1]).toBe(String(FB_SUBDOMAIN_INDEX));
    expect(buildFbc("x", 1)?.split(".")[1]).toBe(String(FB_SUBDOMAIN_INDEX));
  });
});

describe("readFbclid", () => {
  it("extrai o fbclid da URL do evento", () => {
    expect(readFbclid("https://orion.com.br/planos?fbclid=IwAR0abc")).toBe("IwAR0abc");
  });

  it("convive com outros parâmetros", () => {
    expect(readFbclid("https://orion.com.br/?utm_source=meta&fbclid=abc123&x=1")).toBe("abc123");
  });

  it("devolve null quando não há fbclid", () => {
    expect(readFbclid("https://orion.com.br/planos")).toBeNull();
  });

  it("devolve null para fbclid vazio, em vez de mandar lixo pra Meta", () => {
    expect(readFbclid("https://orion.com.br/?fbclid=")).toBeNull();
    expect(readFbclid("https://orion.com.br/?fbclid=%20%20")).toBeNull();
  });

  it("não quebra com URL inválida nem ausente", () => {
    expect(readFbclid("nao-e-url")).toBeNull();
    expect(readFbclid(undefined)).toBeNull();
    expect(readFbclid(null)).toBeNull();
  });
});
