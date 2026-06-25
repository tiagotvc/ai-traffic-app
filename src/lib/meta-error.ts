import "server-only";

export type MetaErrorContext = {
  isWorkspaceMember?: boolean;
  tokenSource?: "workspace" | "own" | null;
};

/** Mensagem legível para erros da Meta Graph API. */
export function formatMetaGraphError(err: unknown, context?: MetaErrorContext): string {
  if (!(err instanceof Error)) return "Erro desconhecido na Meta.";

  const raw = err.message;
  const jsonStart = raw.indexOf("{");
  if (jsonStart >= 0) {
    try {
      const parsed = JSON.parse(raw.slice(jsonStart)) as {
        error?: {
          message?: string;
          code?: number;
          error_subcode?: number;
          type?: string;
          error_user_msg?: string;
          error_user_title?: string;
        };
      };
      const e = parsed.error;
      if (e?.message) {
        const code = e.code != null ? ` (código ${e.code})` : "";
        const userHint = e.error_user_msg?.trim();
        if (e.code === 190) return `Token Meta expirado ou inválido. Reconecte em Configurações.${code}`;
        if (e.code === 104) return `Sessão Meta inválida. Reconecte o Facebook.${code}`;
        if (e.code === 200) {
          const detail = e.message?.trim() || "Permissão negada";
          const reconnectHint =
            "Vá em Configurações → Reconectar Meta, autorize ads_read e ads_management e selecione esta conta de anúncios no diálogo da Meta.";
          if (context?.isWorkspaceMember) {
            return `A conexão Meta do administrador não tem acesso a esta conta (${detail}). Peça ao administrador para reconectar e conceder a conta no Gerenciador de Anúncios. ${reconnectHint}${code}`;
          }
          if (context?.tokenSource === "workspace") {
            return `Sem acesso a esta conta com a conexão Meta do workspace (${detail}). ${reconnectHint}${code}`;
          }
          return `Permissão negada na Meta (${detail}). ${reconnectHint}${code}`;
        }
        if (e.code === 4 || e.code === 17 || e.code === 32 || e.code === 613) {
          const title = e.error_user_title?.trim();
          const base =
            userHint ||
            title ||
            "A Meta limitou temporariamente as consultas deste app. Aguarde alguns minutos e tente de novo.";
          return `${base}${code}`;
        }
        if (e.error_subcode === 1487694) {
          return (
            userHint ||
            "Uma categoria de segmentação (interesse, comportamento ou demografia) não está mais disponível na Meta. " +
              "Edite a persona ou o targeting do conjunto, remova segmentos antigos e tente publicar de novo."
          );
        }
        if (userHint) return `${userHint}${code}`;
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
