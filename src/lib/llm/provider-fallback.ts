import { getLlmProvidersStatus } from "@/lib/llm/keys";
import type { LlmProviderId } from "@/lib/llm/types";

/**
 * Executa `fn` no provedor preferido e cai para o outro se ele falhar.
 *
 * O fallback dispara em QUALQUER erro, não só nos temporários: saldo
 * insuficiente e chave inválida voltam como 400/401 (permanentes) e travavam a
 * geração mesmo com o outro provedor saudável. É o mesmo comportamento do
 * roteador usado pelo Commander (`lib/ai/generate.ts`).
 *
 * Provedor sem chave configurada não entra na fila.
 */
export async function withProviderFallback<T>(
  preferred: LlmProviderId,
  fn: (provider: LlmProviderId) => Promise<T>
): Promise<{ result: T; provider: LlmProviderId }> {
  const status = getLlmProvidersStatus();
  const order: LlmProviderId[] =
    preferred === "claude"
      ? [...(status.claude ? (["claude"] as const) : []), ...(status.gemini ? (["gemini"] as const) : [])]
      : [...(status.gemini ? (["gemini"] as const) : []), ...(status.claude ? (["claude"] as const) : [])];

  if (!order.length) {
    throw new Error("IA não configurada. Defina ANTHROPIC_API_KEY ou GEMINI_API_KEY no servidor.");
  }

  let lastErr: unknown;
  for (let i = 0; i < order.length; i++) {
    const provider = order[i]!;
    const isLast = i === order.length - 1;
    try {
      const result = await fn(provider);
      return { result, provider };
    } catch (e) {
      lastErr = e;
      if (isLast) throw e;
      // Sem este aviso, uma falha de billing no provedor primário fica invisível:
      // o pedido continua funcionando pelo secundário e ninguém percebe a conta zerada.
      console.warn(
        `[llm] provedor "${provider}" falhou, tentando o próximo:`,
        e instanceof Error ? e.message.slice(0, 200) : String(e)
      );
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Serviço de IA temporariamente indisponível.");
}
