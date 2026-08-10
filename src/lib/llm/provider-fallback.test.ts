import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regressão: uma falha permanente do provedor primário (saldo insuficiente,
 * chave inválida) precisa cair para o outro provedor. Antes só as falhas
 * classificadas como temporárias acionavam o fallback, então "credit balance
 * too low" (HTTP 400) derrubava a geração de personas mesmo com o Gemini
 * saudável — enquanto o Commander, que usa outro roteador, seguia funcionando.
 */

const status = { gemini: true, claude: true };

vi.mock("server-only", () => ({}));
vi.mock("@/lib/llm/keys", () => ({
  getLlmProvidersStatus: () => status
}));

const { withProviderFallback } = await import("@/lib/llm/provider-fallback");

const CREDIT_ERROR = new Error(
  'Anthropic error: 400 {"error":{"message":"Your credit balance is too low to access the Anthropic API."}}'
);

describe("withProviderFallback", () => {
  beforeEach(() => {
    status.gemini = true;
    status.claude = true;
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("cai para o gemini quando o claude falha por saldo insuficiente", async () => {
    const fn = vi.fn(async (provider: string) => {
      if (provider === "claude") throw CREDIT_ERROR;
      return "resultado-gemini";
    });

    await expect(withProviderFallback("claude", fn)).resolves.toEqual({
      result: "resultado-gemini",
      provider: "gemini"
    });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("respeita a preferência: não chama o fallback se o primário funciona", async () => {
    const fn = vi.fn(async () => "ok");

    await expect(withProviderFallback("claude", fn)).resolves.toEqual({
      result: "ok",
      provider: "claude"
    });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("claude");
  });

  it("mantém o gemini como primário quando ele é o preferido", async () => {
    const fn = vi.fn(async () => "ok");

    await expect(withProviderFallback("gemini", fn)).resolves.toEqual({
      result: "ok",
      provider: "gemini"
    });
    expect(fn).toHaveBeenCalledWith("gemini");
  });

  it("propaga o erro quando todos os provedores falham", async () => {
    const fn = vi.fn(async () => {
      throw CREDIT_ERROR;
    });

    await expect(withProviderFallback("claude", fn)).rejects.toThrow(/credit balance/i);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("não tenta um provedor sem chave configurada", async () => {
    status.gemini = false;
    const fn = vi.fn(async () => {
      throw CREDIT_ERROR;
    });

    await expect(withProviderFallback("claude", fn)).rejects.toThrow(/credit balance/i);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("claude");
  });

  it("falha claramente quando nenhum provedor está configurado", async () => {
    status.gemini = false;
    status.claude = false;
    const fn = vi.fn();

    await expect(withProviderFallback("claude", fn)).rejects.toThrow(/IA não configurada/);
    expect(fn).not.toHaveBeenCalled();
  });
});
