import "server-only";

/** Mensagem legível para erros da Meta Graph API. */
export function formatMetaGraphError(err: unknown): string {
  if (!(err instanceof Error)) return "Erro desconhecido na Meta.";

  const raw = err.message;
  const jsonStart = raw.indexOf("{");
  if (jsonStart >= 0) {
    try {
      const parsed = JSON.parse(raw.slice(jsonStart)) as {
        error?: { message?: string; code?: number; error_subcode?: number; type?: string };
      };
      const e = parsed.error;
      if (e?.message) {
        const code = e.code != null ? ` (código ${e.code})` : "";
        if (e.code === 190) return `Token Meta expirado ou inválido. Reconecte em Configurações.${code}`;
        if (e.code === 104) return `Sessão Meta inválida. Reconecte o Facebook.${code}`;
        if (e.code === 200) return `${e.message}${code}`;
        if (e.code === 17 || e.code === 613) return `Limite de requisições Meta atingido. Tente em alguns minutos.${code}`;
        return `${e.message}${code}`;
      }
    } catch {
      /* fall through */
    }
  }

  if (raw.includes("access token")) {
    return "Token de acesso Meta ausente ou inválido. Reconecte em Configurações.";
  }
  if (raw.includes("Aguarde")) return raw;

  return raw.length > 280 ? `${raw.slice(0, 280)}…` : raw;
}
